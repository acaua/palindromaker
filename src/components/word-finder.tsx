import { useEffect, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

import type { Dictionary, SearchMode } from "@/lib/dictionary";
import { loadDictionary, mirrorWord, searchWords } from "@/lib/dictionary";

type Status = "idle" | "loading" | "ready" | "error";

const modes: Array<{ value: SearchMode; label: string }> = [
  { value: "starts", label: "starts with" },
  { value: "ends", label: "ends with" },
  { value: "contains", label: "contains" },
];

export default function WordFinder() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("starts");
  const [status, setStatus] = useState<Status>("idle");
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (!open || status === "ready" || status === "loading") return;
    setStatus("loading");
    loadDictionary().then(
      (loaded) => {
        setDictionary(loaded);
        setStatus("ready");
      },
      () => setStatus("error"),
    );
  }, [open, status]);

  useEffect(() => {
    if (!dictionary) return;
    const handle = setTimeout(() => {
      setResults(searchWords(dictionary, query, mode));
    }, 150);
    return () => clearTimeout(handle);
  }, [dictionary, query, mode]);

  const hasQuery = query.trim() !== "";

  return (
    <section className="border-t-2 border-gray-200">
      <div className="p-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex cursor-pointer items-center rounded-sm bg-gray-100 px-2 py-1 text-gray-500"
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
          <div className="flex items-center gap-2 px-2 pb-2">
            <input
              type="text"
              aria-label="search words"
              placeholder="search…"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 grow rounded-sm bg-gray-100 px-2 py-1 font-mono text-lg"
            />
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
                      : "bg-gray-100 text-gray-500"
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
                onClick={() => setStatus("idle")}
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
            <ul
              aria-label="results"
              className="max-h-80 overflow-y-auto px-2 pb-2 font-mono text-lg"
            >
              {results.map((word, index) => (
                <li
                  key={`${word}-${index}`}
                  className="flex justify-between gap-4 [content-visibility:auto]"
                >
                  <span>{word}</span>
                  <span className="text-gray-400">{mirrorWord(word)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
