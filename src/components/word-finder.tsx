import { useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { FinderLegend } from "@/components/legend";
import WordFinderControls from "@/components/word-finder-controls";
import WordFinderResults from "@/components/word-finder-results";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDictionary } from "@/hooks/use-dictionary";
import { useI18n } from "@/hooks/use-i18n";
import type { Language, SearchMode } from "@/lib/dictionary";
import { searchWords } from "@/lib/dictionary";
import type { MessageKey } from "@/lib/i18n";
import {
  localStorageOrNull,
  readStoredPrefs,
  writePrefs,
} from "@/lib/persistence";
import type { WordInsertMode } from "@/lib/word-insert";

const SEARCH_DELAY = 150;

// what a click on a result will do, said before the click rather than
// discovered after it
const insertHintKeys: Record<WordInsertMode, MessageKey> = {
  mirrored: "finder.hintMirrored",
  paused: "finder.hintPaused",
  caret: "finder.hintCaret",
};

// A floating panel: docked beside the editor from md up, a bottom sheet on
// phones. Whether it is shown at all is the app's finderOpen state —
// closed here means rendered as nothing, with the full column for the card.
// The md top offset clears the site header (h-14 + gap), which is sticky
// and would otherwise swallow the panel's top edge.
export default function WordFinder({
  open,
  onClose,
  onInsertWord,
  insertMode,
}: {
  open: boolean;
  onClose: () => void;
  onInsertWord: (word: string) => void;
  insertMode: WordInsertMode;
}) {
  const storage = localStorageOrNull();
  const { t } = useI18n();
  const [language, setLanguage] = useState<Language>(
    () => readStoredPrefs(storage).lang ?? "pt-br",
  );
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("starts");

  // the dictionaries are megabytes: nothing loads while the panel is closed,
  // and a load overtaken by closing (or a language switch) is dropped
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

  if (!open) return null;

  return (
    <aside
      id="word-finder-panel"
      aria-label={t("finder.aria")}
      className="fixed z-20 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200/60 max-md:inset-x-3 max-md:bottom-4 max-md:top-[48%] md:top-16 md:right-[4.5rem] md:bottom-12 md:w-[23rem] xl:right-20 xl:w-[25rem]"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <span className="font-semibold text-gray-900">{t("findWords")}</span>
        <button
          type="button"
          aria-label={t("finder.close")}
          onClick={onClose}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-gray-400 hover:bg-gray-100"
        >
          <XMarkIcon aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-3">
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
          {t(insertHintKeys[insertMode])}
        </p>

        {state.status === "loading" && (
          <p className="px-4 pb-4 text-sm text-gray-500">
            {t("finder.loading")}
          </p>
        )}

        {state.status === "error" && (
          <p className="px-4 pb-4 text-sm text-red-700">
            {t("finder.error")}{" "}
            <button
              type="button"
              onClick={state.retry}
              className="cursor-pointer underline"
            >
              {t("finder.retry")}
            </button>
          </p>
        )}

        {dictionary && hasQuery && results.length === 0 && (
          <p className="px-4 pb-4 text-sm text-gray-500">
            {t("finder.noMatches")}
          </p>
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
    </aside>
  );
}
