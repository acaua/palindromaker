import { normalizeText } from "@/lib/check-palindrome";

export type Language = "pt-br" | "en" | "es" | "de" | "fr" | "it";

export interface LanguageInfo {
  code: Language;
  label: string;
  file: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: "pt-br", label: "português (BR)", file: "/dictionary/pt-br.txt" },
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
}

export const buildDictionary = (text: string): Dictionary => {
  const words = text.split("\n").filter((word) => word !== "");
  return { words, normalized: words.map(normalizeText) };
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
        return buildDictionary(await response.text());
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
