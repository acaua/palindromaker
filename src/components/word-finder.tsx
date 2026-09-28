import { useMemo, useState } from "react";
import type { ReactNode } from "react";
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
import { prefsStore } from "@/lib/prefs-store";
import type { WordInsertMode } from "@/lib/word-insert";

const SEARCH_DELAY = 150;

// what a click on a result will do, said before the click rather than
// discovered after it
const insertHintKeys: Record<WordInsertMode, MessageKey> = {
  mirrored: "finder.hintMirrored",
  paused: "finder.hintPaused",
  caret: "finder.hintCaret",
};

// the one muted note style the panel uses for its loading, idle and
// no-match lines
const FinderNote = ({ children }: { children: ReactNode }) => (
  <p className="px-4 pb-4 text-sm text-gray-500">{children}</p>
);

// The finder panel. On phones it is an ordinary block in the page flow,
// rendered below the editor card, so it never covers the editor and the user
// scrolls down to reach it. From md up it becomes a floating panel docked
// beside the editor: the md top offset clears the sticky site header
// (h-14 + gap), which would otherwise swallow the panel's top edge. Whether
// it is shown at all is the app's finderOpen state — closed here means
// rendered as nothing.
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
  const [prefs] = useState(() => prefsStore());
  const { t } = useI18n();
  const [language, setLanguage] = useState<Language>(() => prefs.read().lang);
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

  // On phones the panel is in the page flow, so nothing reserves its space;
  // the results list caps its own height and scrolls internally instead.
  return (
    <aside
      id="word-finder-panel"
      aria-label={t("finder.aria")}
      className="z-20 mt-5 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200/60 md:fixed md:top-16 md:right-[4.5rem] md:bottom-12 md:mt-0 md:w-[23rem] xl:right-20 xl:w-[25rem]"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <span className="font-semibold text-gray-900">{t("findWords")}</span>
        <button
          type="button"
          aria-label={t("finder.close")}
          onClick={onClose}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-gray-400 hover:bg-gray-100 max-md:min-h-11 max-md:min-w-11"
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
            prefs.write({ lang: code });
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

        {state.status === "loading" && <FinderNote>{t("finder.loading")}</FinderNote>}

        {state.status === "error" && (
          <p className="px-4 pb-4 text-sm text-red-700">
            {t("finder.error")}{" "}
            <button type="button" onClick={state.retry} className="cursor-pointer underline">
              {t("finder.retry")}
            </button>
          </p>
        )}

        {dictionary && !hasQuery && <FinderNote>{t("finder.idle")}</FinderNote>}

        {dictionary && hasQuery && results.length === 0 && (
          <FinderNote>{t("finder.noMatches")}</FinderNote>
        )}

        {dictionary && results.length > 0 && (
          <WordFinderResults words={results} dictionary={dictionary} onInsert={onInsertWord} />
        )}

        <div className="mt-auto">
          <FinderLegend />
        </div>
      </div>
    </aside>
  );
}
