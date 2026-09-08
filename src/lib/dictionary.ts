import { normalizeText } from "@/lib/check-palindrome";

export type Language = "pt-br" | "en" | "es" | "de" | "fr" | "it";

export interface LanguageInfo {
  code: Language;
  label: string;
  file: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: "pt-br", label: "português", file: "/dictionary/pt-br.txt" },
  { code: "en", label: "english", file: "/dictionary/en.txt" },
  { code: "es", label: "español", file: "/dictionary/es.txt" },
  { code: "de", label: "deutsch", file: "/dictionary/de.txt" },
  { code: "fr", label: "français", file: "/dictionary/fr.txt" },
  { code: "it", label: "italiano", file: "/dictionary/it.txt" },
];

export type SearchMode = "starts" | "ends" | "contains";

export interface Dictionary {
  words: string[];
  normalized: string[];
  normalizedSet: Set<string>;
}

// how many lines to read before offering to yield; ~10ms of work for the
// largest dictionary (635k words, measured at ~0.45µs per word)
const LINES_PER_SLICE = 20_000;

// The build itself, in resumable slices. Normalizing and deduplicating a
// megabyte-scale word list is hundreds of milliseconds of work, and the
// lines are walked one at a time (rather than split() up front) so no
// single step allocates the whole list.
function* buildSlices(text: string): Generator<void, Dictionary, void> {
  const words: string[] = [];
  const normalized: string[] = [];
  // words whose normalized forms collide (duplicates, case/accents) are
  // deduplicated, keeping the first spelling; the lists stay parallel
  const seen = new Set<string>();
  let at = 0;
  let sinceYield = 0;

  while (at <= text.length) {
    const lineEnd = text.indexOf("\n", at);
    const end = lineEnd === -1 ? text.length : lineEnd;
    const raw = text.slice(at, end);
    at = end + 1;

    if (raw !== "") {
      const normalizedWord = normalizeText(raw);
      if (!seen.has(normalizedWord)) {
        seen.add(normalizedWord);
        words.push(raw);
        normalized.push(normalizedWord);
      }
    }

    if (++sinceYield === LINES_PER_SLICE) {
      sinceYield = 0;
      yield;
    }
  }

  return { words, normalized, normalizedSet: seen };
}

export const buildDictionary = (text: string): Dictionary => {
  const slices = buildSlices(text);
  let slice = slices.next();
  while (!slice.done) slice = slices.next();
  return slice.value;
};

// hands the main thread back between slices; scheduler.yield resumes the
// build sooner than a timer, which browsers clamp to ~4ms
const yieldToBrowser = (): Promise<void> => {
  const { scheduler } = globalThis as {
    scheduler?: { yield?: () => Promise<void> };
  };
  return scheduler?.yield?.() ?? new Promise((resolve) => setTimeout(resolve));
};

// Same dictionary as buildDictionary, built without blocking: the panel
// shows "loading dictionary…" for a few ms longer, but typing, scrolling
// and the editor stay responsive throughout.
export const buildDictionaryIncrementally = async (
  text: string,
  yieldControl: () => Promise<void> = yieldToBrowser,
): Promise<Dictionary> => {
  const slices = buildSlices(text);
  for (;;) {
    const slice = slices.next();
    if (slice.done) return slice.value;
    await yieldControl();
  }
};

const dictionaryPromises = new Map<Language, Promise<Dictionary>>();

export const loadDictionary = (language: Language): Promise<Dictionary> => {
  let promise = dictionaryPromises.get(language);
  if (!promise) {
    const file =
      LANGUAGES.find((info) => info.code === language)?.file ??
      `/dictionary/${language}.txt`;
    promise = fetch(file).then(
      async (response) => {
        if (!response.ok) {
          dictionaryPromises.delete(language);
          throw new Error(`Failed to load dictionary: ${response.status}`);
        }
        return buildDictionaryIncrementally(await response.text());
      },
      (error: unknown) => {
        dictionaryPromises.delete(language);
        throw error;
      },
    );
    dictionaryPromises.set(language, promise);
  }
  return promise;
};

// dictionary entries are single words, so surrounding spaces are always a
// typing artefact rather than something to match on
export const searchWords = (
  dictionary: Dictionary,
  query: string,
  mode: SearchMode,
): string[] => {
  const needle = normalizeText(query.trim());
  if (needle === "") return [];

  const matcher =
    mode === "starts"
      ? (normalized: string) => normalized.startsWith(needle)
      : mode === "ends"
        ? (normalized: string) => normalized.endsWith(needle)
        : (normalized: string) => normalized.includes(needle);

  const results: string[] = [];
  for (let i = 0; i < dictionary.words.length; i++) {
    if (matcher(dictionary.normalized[i])) {
      results.push(dictionary.words[i]);
    }
  }
  return results;
};

export const mirrorWord = (word: string): string =>
  [...word].reverse().join("");

export type MirrorMatch = "pair" | "palindrome" | null;

// what the word's mirror means for building palindromes: "palindrome"
// when the word mirrors to itself, "pair" when the mirror is also a
// dictionary word, null otherwise (accent/case-insensitive)
export const mirrorMatch = (
  dictionary: Dictionary,
  word: string,
): MirrorMatch => {
  const normalized = normalizeText(word);
  const mirrored = normalizeText(mirrorWord(word));
  if (mirrored === normalized) return "palindrome";
  return dictionary.normalizedSet.has(mirrored) ? "pair" : null;
};
