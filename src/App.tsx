import { useCallback, useRef, useState } from "react";

import Editor from "@/components/editor";
import {
  localStorageOrNull,
  readStoredPrefs,
  writePrefs,
} from "@/lib/persistence";

export default function App() {
  const storage = localStorageOrNull();
  // open by default; the choice is remembered like the mirror toggle
  const [finderOpen, setFinderOpen] = useState(
    () => readStoredPrefs(storage).finderOpen ?? true,
  );
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
      className={`flex min-h-dvh flex-col bg-[#faf8f5] px-5 py-5 ${
        // the reservation is the mockup's column inset (27.5rem / 30rem)
        // plus one 1.25rem pad: at md it replaces pr-5, and the mockup
        // keeps that pad *inside* the column
        finderOpen ? "max-md:pb-[48dvh] md:pr-[28.75rem] xl:pr-[31.25rem]" : ""
      }`}
    >
      <div className="m-auto w-full max-w-3xl">
        <header>
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="text-2xl font-bold text-violet-600 md:text-3xl"
            >
              ↔
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
              Palindromaker
            </h1>
          </div>
          <p className="mt-2.5 max-w-xl text-sm leading-5 text-gray-600 md:mt-3 md:text-base md:leading-6">
            Write a phrase. We’ll show where its mirrored letters agree—and
            where they break.
          </p>
        </header>

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
