import { useKeyedResource } from "@/hooks/use-keyed-resource";
import { loadDictionary } from "@/lib/dictionary";
import type { Dictionary, Language } from "@/lib/dictionary";

// One value instead of separate status/dictionary/language fields, so the
// dictionary simply does not exist unless it is the loaded one: a language
// that is still loading or failed cannot leave the previous language's
// words on screen.
type DictionaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; dictionary: Dictionary }
  | { status: "error"; retry: () => void };

// what a load produced; the keyed attempt, the stale-response drop and the
// retry are useKeyedResource's, so the hook only names its own states
type DictionaryOutcome =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; dictionary: Dictionary }
  | { status: "error" };

// Loads the dictionary for `language`, but only once `enabled` (the panel
// is closed most of the time, and the files are megabytes).
export const useDictionary = (language: Language, enabled: boolean): DictionaryState => {
  const { state, retry } = useKeyedResource<DictionaryOutcome>(
    enabled ? language : null,
    () =>
      loadDictionary(language).then(
        (dictionary): DictionaryOutcome => ({ status: "ready", dictionary }),
        (): DictionaryOutcome => ({ status: "error" }),
      ),
    {
      idle: { status: "idle" },
      loading: { status: "loading" },
      error: { status: "error" },
    },
  );

  if (state.status === "error") return { status: "error", retry };
  return state;
};
