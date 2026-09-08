import { useCallback, useEffect, useState } from "react";

import { loadDictionary } from "@/lib/dictionary";
import type { Dictionary, Language } from "@/lib/dictionary";

// One value instead of separate status/dictionary/language fields, so the
// dictionary simply does not exist unless it is the loaded one: a language
// that is still loading or failed cannot leave the previous language's
// words on screen.
export type DictionaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; dictionary: Dictionary }
  | { status: "error"; retry: () => void };

// what a load produced, and which request it answers
interface Outcome {
  language: Language;
  attempt: number;
  dictionary: Dictionary | null; // null: the load failed
}

// Loads the dictionary for `language`, but only once `enabled` (the panel
// is closed most of the time, and the files are megabytes).
export const useDictionary = (
  language: Language,
  enabled: boolean,
): DictionaryState => {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  useEffect(() => {
    if (!enabled) return;

    // a response that arrives after the language changed again answers a
    // request nobody is waiting for, and must not replace a newer one
    let current = true;
    loadDictionary(language).then(
      (dictionary) => {
        if (current) setOutcome({ language, attempt, dictionary });
      },
      () => {
        if (current) setOutcome({ language, attempt, dictionary: null });
      },
    );

    return () => {
      current = false;
    };
  }, [language, enabled, attempt]);

  if (!enabled) return { status: "idle" };
  // "loading" is not stored: it is simply not having an answer yet for the
  // language (and attempt) being asked about
  if (outcome?.language !== language || outcome.attempt !== attempt) {
    return { status: "loading" };
  }
  return outcome.dictionary
    ? { status: "ready", dictionary: outcome.dictionary }
    : { status: "error", retry };
};
