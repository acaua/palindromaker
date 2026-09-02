import { normalizeText } from "@/lib/check-palindrome";

export type SearchMode = "starts" | "ends" | "contains";

export interface Dictionary {
  words: string[];
  normalized: string[];
}

export const buildDictionary = (text: string): Dictionary => {
  const words = text.split("\n").filter((word) => word !== "");
  return { words, normalized: words.map(normalizeText) };
};

let dictionaryPromise: Promise<Dictionary> | undefined;

export const loadDictionary = (): Promise<Dictionary> => {
  if (!dictionaryPromise) {
    dictionaryPromise = fetch("/dictionary/pt-br.txt").then(
      async (response) => {
        if (!response.ok) {
          dictionaryPromise = undefined;
          throw new Error(`Failed to load dictionary: ${response.status}`);
        }
        return buildDictionary(await response.text());
      },
      (error: unknown) => {
        dictionaryPromise = undefined;
        throw error;
      },
    );
  }
  return dictionaryPromise;
};

export const searchWords = (
  dictionary: Dictionary,
  query: string,
  mode: SearchMode,
): string[] => {
  const needle = normalizeText(query);
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
