import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";

import type { Dictionary, Language, SearchMode } from "@/lib/dictionary";
import {
  LANGUAGES,
  loadDictionary,
  mirrorMatch,
  mirrorWord,
  searchWords,
} from "@/lib/dictionary";
import { readStoredPrefs, writePrefs } from "@/lib/persistence";

type Status = "idle" | "loading" | "ready" | "error";

const ROW_HEIGHT = 32;
const OVERSCAN = 6;

const modes: Array<{ value: SearchMode; label: string }> = [
  { value: "starts", label: "starts with" },
  { value: "ends", label: "ends with" },
  { value: "contains", label: "contains" },
];

export default function WordFinder() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Language>(
    () => readStoredPrefs(localStorage).lang ?? "pt-br",
  );
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("starts");
  const [status, setStatus] = useState<Status>("idle");
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [dictionaryLang, setDictionaryLang] = useState<Language | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const requestRef = useRef(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const load = (code: Language) => {
    const request = ++requestRef.current;
    setStatus("loading");
    setResults([]);
    loadDictionary(code).then(
      (loaded) => {
        if (requestRef.current !== request) return;
        setDictionary(loaded);
        setDictionaryLang(code);
        setStatus("ready");
      },
      () => {
        if (requestRef.current !== request) return;
        setStatus("error");
      },
    );
  };

  useEffect(() => {
    if (!open || (dictionaryLang === lang && dictionary)) return;
    load(lang);
  }, [open, lang, dictionary, dictionaryLang]);

  useEffect(() => {
    if (!dictionary) return;
    const handle = setTimeout(() => {
      setResults(searchWords(dictionary, query, mode));
    }, 150);
    return () => clearTimeout(handle);
  }, [dictionary, query, mode]);

  // TanStack Virtual's instance is not compiler-memoizable; safe here since
  // it stays local to this component
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
    // avoid React 19's "flushSync was called from inside a lifecycle method" warning
    useFlushSync: false,
  });

  useEffect(() => {
    virtualizer.scrollToOffset(0);
  }, [results, virtualizer]);

  const virtualItems = virtualizer.getVirtualItems();

  const hasQuery = query.trim() !== "";

  return (
    <section className="border-t-2 border-gray-200">
      <div className="p-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex cursor-pointer items-center rounded-sm bg-gray-100 px-2 py-1 text-gray-600"
        >
          {open ? (
            <ChevronDownIcon className="mr-1 inline-block h-6 w-6" />
          ) : (
            <ChevronRightIcon className="mr-1 inline-block h-6 w-6" />
          )}
          find words
        </button>
      </div>

      {open && (
        <div>
          <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
            <input
              type="text"
              aria-label="search words"
              placeholder="search…"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 grow rounded-sm bg-gray-100 px-2 py-1 font-mono text-lg"
            />
            <select
              aria-label="dictionary language"
              value={lang}
              onChange={(event) => {
                const code = event.target.value as Language;
                setLang(code);
                writePrefs(localStorage, { lang: code });
              }}
              className="shrink-0 cursor-pointer rounded-sm bg-gray-100 px-2 py-1 text-sm text-gray-600"
            >
              {LANGUAGES.map(({ code, label }) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex shrink-0">
              {modes.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={`cursor-pointer px-2 py-1 text-sm first:rounded-l-sm last:rounded-r-sm ${
                    mode === value
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {status === "loading" && (
            <p className="px-2 pb-2 text-sm text-gray-500">
              loading dictionary…
            </p>
          )}

          {status === "error" && (
            <p className="px-2 pb-2 text-sm text-red-700">
              failed to load dictionary{" "}
              <button
                type="button"
                onClick={() => load(lang)}
                className="cursor-pointer underline"
              >
                retry
              </button>
            </p>
          )}

          {status === "ready" && hasQuery && results.length === 0 && (
            <p className="px-2 pb-2 text-sm text-gray-500">no matches</p>
          )}

          {results.length > 0 && (
            <div
              ref={scrollerRef}
              role="list"
              aria-label="results"
              className="max-h-80 overflow-y-auto font-mono text-lg"
            >
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {virtualItems.map((virtualRow) => {
                  const word = results[virtualRow.index];
                  const match = dictionary
                    ? mirrorMatch(dictionary, word)
                    : null;
                  return (
                    <div
                      key={word}
                      role="listitem"
                      aria-posinset={virtualRow.index + 1}
                      aria-setsize={results.length}
                      className="absolute left-0 top-0 flex h-8 w-full items-center gap-4 px-2"
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      <span className="min-w-0 flex-1 truncate" title={word}>
                        {word}
                      </span>
                      <span
                        className={`min-w-0 truncate ${
                          match === "pair"
                            ? "text-purple-700"
                            : match === "palindrome"
                              ? "text-green-700"
                              : "text-gray-500"
                        }`}
                        title={
                          match === "pair"
                            ? "mirror is also a word"
                            : match === "palindrome"
                              ? "palindrome word"
                              : mirrorWord(word)
                        }
                      >
                        {mirrorWord(word)}
                        {match === "pair" && (
                          <span className="sr-only">
                            {" "}
                            (mirror is also a word)
                          </span>
                        )}
                        {match === "palindrome" && (
                          <span className="sr-only"> (palindrome word)</span>
                        )}
                      </span>
                      {match === "pair" && (
                        <ArrowsRightLeftIcon
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-purple-700"
                        />
                      )}
                      {match === "palindrome" && (
                        <CheckCircleIcon
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-green-700"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
