import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";

import Legend from "@/components/legend";
import type { Dictionary, Language, SearchMode } from "@/lib/dictionary";
import {
  LANGUAGES,
  loadDictionary,
  mirrorMatch,
  mirrorWord,
  searchWords,
} from "@/lib/dictionary";
import {
  localStorageOrNull,
  readStoredPrefs,
  writePrefs,
} from "@/lib/persistence";

type Status = "idle" | "loading" | "ready" | "error";

const ROW_HEIGHT = 32;
const OVERSCAN = 6;

const modes: Array<{ value: SearchMode; label: string }> = [
  { value: "starts", label: "starts with" },
  { value: "ends", label: "ends with" },
  { value: "contains", label: "contains" },
];

export default function WordFinder() {
  const storage = localStorageOrNull();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Language>(
    () => readStoredPrefs(storage).lang ?? "pt-br",
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
    <aside
      className="flex min-w-0 flex-col border-t border-gray-200 bg-gray-50/70 lg:border-t-0 lg:border-l"
      aria-label="word finder"
    >
      <div className="p-4">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-11 w-full cursor-pointer items-center rounded-lg text-left text-gray-900 transition hover:text-violet-700"
        >
          {open ? (
            <ChevronDownIcon className="mr-2 inline-block h-5 w-5 text-gray-500" />
          ) : (
            <ChevronRightIcon className="mr-2 inline-block h-5 w-5 text-gray-500" />
          )}
          <span>
            <span className="block font-semibold">Find words</span>
            <span className="block text-xs font-normal text-gray-500">
              Search by letters and compare spellings
            </span>
          </span>
        </button>
      </div>

      {open && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-3 px-4 pb-4">
            <label className="relative block">
              <span className="sr-only">Search words</span>
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-3 left-3 h-5 w-5 text-gray-400"
              />
              <input
                type="text"
                aria-label="search words"
                placeholder="Search words…"
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-white py-2 pr-3 pl-10 font-mono text-base text-gray-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
                Language
                <select
                  aria-label="dictionary language"
                  value={lang}
                  onChange={(event) => {
                    const code = event.target.value as Language;
                    setLang(code);
                    writePrefs(storage, { lang: code });
                  }}
                  className="min-h-10 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700"
                >
                  {LANGUAGES.map(({ code, label }) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div
              className="grid grid-cols-3 rounded-lg bg-gray-200/70 p-1"
              aria-label="match position"
            >
              {modes.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={`min-h-9 cursor-pointer rounded-md px-2 py-1 text-xs font-medium transition ${
                    mode === value
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {status === "loading" && (
            <p className="px-4 pb-4 text-sm text-gray-500">
              loading dictionary…
            </p>
          )}

          {status === "error" && (
            <p className="px-4 pb-4 text-sm text-red-700">
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
            <p className="px-4 pb-4 text-sm text-gray-500">No matches</p>
          )}

          {results.length > 0 && (
            <>
              <div className="flex items-center justify-between border-y border-gray-200 px-4 py-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                <span>Word</span>
                <span>
                  Mirror · {results.length.toLocaleString()} result
                  {results.length === 1 ? "" : "s"}
                </span>
              </div>
              <div
                ref={scrollerRef}
                role="list"
                aria-label="results"
                className="max-h-80 overflow-y-auto font-mono text-base lg:max-h-[398px]"
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
                        className="absolute top-0 left-0 flex h-8 w-full items-center gap-3 px-4 hover:bg-white"
                        style={{
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
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
            </>
          )}
          <div className="mt-auto">{open && <Legend variant="finder" />}</div>
        </div>
      )}
    </aside>
  );
}
