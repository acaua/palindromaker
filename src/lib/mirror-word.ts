import { normalizeText } from "@/lib/check-palindrome";

// segment by grapheme cluster so astral/emoji letters survive the round trip
// (a plain [...word] split would cut them into unpaired surrogate halves)
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

// the spelling of a word with its grapheme order reversed — its mirror in
// the letter-space sense, computed accent/case-preserving
export const mirrorWord = (word: string): string =>
  [...graphemes.segment(word)]
    .reverse()
    .map((s) => s.segment)
    .join("");

// whether a word is its own mirror, the test both the finder's "palindrome"
// marker and the word-insert planner use
export const mirrorsItself = (word: string): boolean =>
  normalizeText(mirrorWord(word)) === normalizeText(word);
