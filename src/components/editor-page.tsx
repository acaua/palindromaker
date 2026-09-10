import { useCallback, useRef, useState } from "react";

import Editor from "@/components/editor";
import { useI18n } from "@/hooks/use-i18n";
import { localStorageOrNull, readStoredPrefs, writePrefs } from "@/lib/persistence";

// the home route: today's page minus the header row, which the site header
// (brand, links, language select) now owns. The tagline stays here because
// it is page content, and the sr-only h1 keeps the document outline — the
// visible brand lives in the header's link.
export default function EditorPage() {
  const storage = localStorageOrNull();
  // prefs are read once, like the editor's restored content
  const [restored] = useState(() => readStoredPrefs(storage));
  const { t } = useI18n();
  // open by default; the choice is remembered like the mirror toggle
  const [finderOpen, setFinderOpen] = useState(() => restored.finderOpen ?? true);
  // the status bar's "Find words" trigger; the panel's ✕ returns focus to it
  const triggerRef = useRef<HTMLButtonElement>(null);

  const toggleFinder = useCallback(() => {
    setFinderOpen(!finderOpen);
    writePrefs(storage, { finderOpen: !finderOpen });
  }, [finderOpen, storage]);

  const closeFinder = useCallback(() => {
    setFinderOpen(false);
    writePrefs(storage, { finderOpen: false });
    triggerRef.current?.focus();
  }, [storage]);

  return (
    // the word finder is a fixed panel: on md+ the column keeps out of its
    // way, on mobile the sheet covers the bottom half. `m-auto` centers the
    // column like the mockup when it fits, and falls back to page scroll
    // from the top when a long palindrome outgrows the viewport — the
    // vertical padding is what that fallback rests on, since the auto
    // margins collapse to nothing exactly then.
    <main
      className={`flex flex-1 flex-col bg-[#faf8f5] px-5 py-5 ${
        // the reservation is the mockup's column inset (27.5rem / 30rem)
        // plus one 1.25rem pad: at md it replaces pr-5, and the mockup
        // keeps that pad *inside* the column
        finderOpen ? "max-md:pb-[48dvh] md:pr-[28.75rem] xl:pr-[31.25rem]" : ""
      }`}
    >
      <div className="m-auto w-full max-w-3xl">
        {/* the navigation focus target (router.tsx); sr-only, so the
            visible brand stays in the header */}
        <h1 tabIndex={-1} className="sr-only outline-none">
          Palindromaker
        </h1>
        <p className="mt-2.5 max-w-xl text-sm leading-5 text-gray-600 md:mt-3 md:text-base md:leading-6">
          {t("app.tagline")}
        </p>
        <Editor
          finderOpen={finderOpen}
          onToggleFinder={toggleFinder}
          onCloseFinder={closeFinder}
          triggerRef={triggerRef}
        />
      </div>
    </main>
  );
}
