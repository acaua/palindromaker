import { normalizeText } from "@/lib/check-palindrome";
import { mirrorWord, mirrorsItself } from "@/lib/mirror-word";
import { abortReason, sharedRequest } from "@/lib/shared-request";

export type Language = "pt-br" | "en" | "es" | "de" | "fr" | "it";

interface LanguageInfo {
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
// largest dictionary (637k words, measured at ~0.45µs per word)
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

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) throw abortReason(signal);
};

export const buildDictionaryIncrementally = async (
  text: string,
  yieldControl: () => Promise<void> = yieldToBrowser,
  signal?: AbortSignal,
): Promise<Dictionary> => {
  const slices = buildSlices(text);
  for (;;) {
    throwIfAborted(signal);
    const slice = slices.next();
    if (slice.done) return slice.value;
    await yieldControl();
    throwIfAborted(signal);
  }
};

const requestDictionary = async (
  language: Language,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<Dictionary> => {
  const file = LANGUAGES.find((info) => info.code === language)!.file;
  const response = signal ? await fetchImpl(file, { signal }) : await fetchImpl(file);
  if (!response.ok) throw new Error(`Failed to load dictionary: ${response.status}`);
  throwIfAborted(signal);
  return buildDictionaryIncrementally(await response.text(), yieldToBrowser, signal);
};

export const loadDictionary = (
  language: Language,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<Dictionary> =>
  sharedRequest(
    fetchImpl,
    `dictionary|${language}`,
    (requestSignal) => requestDictionary(language, fetchImpl, requestSignal),
    signal,
  );

// dictionary entries are single words, so surrounding spaces are always a
// typing artefact rather than something to match on
export const searchWords = (dictionary: Dictionary, query: string, mode: SearchMode): string[] => {
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

export type MirrorMatch = "pair" | "palindrome" | null;

// what the word's mirror means for building palindromes: "palindrome"
// when the word mirrors to itself, "pair" when the mirror is also a
// dictionary word, null otherwise (accent/case-insensitive)
export const mirrorMatch = (dictionary: Dictionary, word: string): MirrorMatch => {
  if (mirrorsItself(word)) return "palindrome";
  const mirrored = normalizeText(mirrorWord(word));
  return dictionary.normalizedSet.has(mirrored) ? "pair" : null;
};
