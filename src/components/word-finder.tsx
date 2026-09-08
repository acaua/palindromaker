import { useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

import { FinderLegend } from "@/components/legend";
import WordFinderControls from "@/components/word-finder-controls";
import WordFinderResults from "@/components/word-finder-results";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDictionary } from "@/hooks/use-dictionary";
import type { Language, SearchMode } from "@/lib/dictionary";
import { searchWords } from "@/lib/dictionary";
import {
  localStorageOrNull,
  readStoredPrefs,
  writePrefs,
} from "@/lib/persistence";
import type { WordInsertMode } from "@/lib/word-insert";

const SEARCH_DELAY = 150;

// what a click on a result will do, said before the click rather than
// discovered after it
const insertHints: Record<WordInsertMode, string> = {
  mirrored: "Click a word to insert it at the caret, and its mirror opposite.",
  paused:
    "Click a word to insert it at the caret. Mirroring resumes once the text reads the same both ways.",
  caret: "Click a word to insert it at the caret.",
};

export default function WordFinder({
  onInsertWord,
  insertMode,
}: {
  onInsertWord: (word: string) => void;
  insertMode: WordInsertMode;
}) {
  const storage = localStorageOrNull();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(
    () => readStoredPrefs(storage).lang ?? "pt-br",
  );
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("starts");

  // the dictionaries are megabytes, so nothing loads until the panel opens
  const state = useDictionary(language, open);
  const dictionary = state.status === "ready" ? state.dictionary : null;
  // searching every keystroke would scan hundreds of thousands of words
  const search = useDebouncedValue(query, SEARCH_DELAY);

  // derived, not stored: a dictionary that is still loading or failed to
  // load has no results, so another language's words can never linger
  const results = useMemo(
    () => (dictionary ? searchWords(dictionary, search, mode) : []),
    [dictionary, search, mode],
  );

  const hasQuery = search.trim() !== "";

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
          <WordFinderControls
            query={query}
            onQueryChange={setQuery}
            language={language}
            onLanguageChange={(code) => {
              setLanguage(code);
              writePrefs(storage, { lang: code });
            }}
            mode={mode}
            onModeChange={setMode}
          />

          <p
            className={`px-4 pb-3 text-xs ${
              insertMode === "paused" ? "text-amber-700" : "text-gray-500"
            }`}
          >
            {insertHints[insertMode]}
          </p>

          {state.status === "loading" && (
            <p className="px-4 pb-4 text-sm text-gray-500">
              loading dictionary…
            </p>
          )}

          {state.status === "error" && (
            <p className="px-4 pb-4 text-sm text-red-700">
              failed to load dictionary{" "}
              <button
                type="button"
                onClick={state.retry}
                className="cursor-pointer underline"
              >
                retry
              </button>
            </p>
          )}

          {dictionary && hasQuery && results.length === 0 && (
            <p className="px-4 pb-4 text-sm text-gray-500">No matches</p>
          )}

          {dictionary && results.length > 0 && (
            <WordFinderResults
              words={results}
              dictionary={dictionary}
              onInsert={onInsertWord}
            />
          )}

          <div className="mt-auto">
            <FinderLegend />
          </div>
        </div>
      )}
    </aside>
  );
}
