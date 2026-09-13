import { facetExclusions } from "@/lib/annotated-text";
import type { FacetRange } from "@/lib/annotated-text";
import { isLetter, normalizeText } from "@/lib/check-palindrome";

// longer than this is more likely an accidental word ("aha", "ovo") than
// a crafted palindrome
export const MIN_PALINDROME_LETTERS = 3;

interface Letter {
  // the normalized letter (one code point usually, occasionally more)
  char: string;
  // the UTF-16 span in the raw text this letter came from
  start: number;
  end: number;
}

// longest palindrome in an array of comparable letters, returned as an
// inclusive [lo, hi] range (or [0, -1] for none)
const longestPalindrome = (letters: readonly string[]): [number, number] => {
  let bestLo = 0;
  let bestHi = -1;
  const consider = (lo: number, hi: number) => {
    if (hi - lo > bestHi - bestLo) {
      bestLo = lo;
      bestHi = hi;
    }
  };
  for (let center = 0; center < letters.length; center++) {
    let lo = center;
    let hi = center;
    while (lo >= 0 && hi < letters.length && letters[lo] === letters[hi]) {
      consider(lo, hi);
      lo -= 1;
      hi += 1;
    }
    lo = center;
    hi = center + 1;
    while (lo >= 0 && hi < letters.length && letters[lo] === letters[hi]) {
      consider(lo, hi);
      lo -= 1;
      hi += 1;
    }
  }
  return [bestLo, bestHi];
};

// Punctuation that may sit right against the palindrome (a trailing "?",
// the quotes around a phrase). A "/" opens a URL or path and never belongs.
const HUGGING_PUNCTUATION = /^\p{P}$/u;
const isHuggingPunctuation = (char: string): boolean =>
  char !== "/" && HUGGING_PUNCTUATION.test(char);

// Closing marks that may trail the palindrome even after whitespace
// ("topa ?"), as opposed to opening brackets/quotes that start something new.
const CLOSING_PUNCTUATION = /^[?!.,;:…\p{Pe}\p{Pf}]$/u;
const isClosingPunctuation = (char: string): boolean => CLOSING_PUNCTUATION.test(char);

const IS_SPACE = /^\s$/;
const IS_NEWLINE = /^[\r\n]$/;
const IS_TAG_CHARACTER = /^[\p{L}\p{N}_.-]$/u;

// An unpaired bracket at the edge is almost certainly not part of the
// palindrome ("abc cba)"); keep one only if its partner exists anywhere.
const BRACKET_PARTNER: Record<string, string> = {
  ")": "(",
  "]": "[",
  "}": "{",
  "(": ")",
  "[": "]",
  "{": "}",
};
const isLoneBracket = (char: string, text: string): boolean => {
  const partner = BRACKET_PARTNER[char];
  return partner !== undefined && !text.includes(partner);
};

// A "#tag" or "@handle" the poster did not facet still must not contribute
// letters: mark the marker and its token the way a facet would. Runs after
// the facet ranges so a real annotation is already covered.
const excludeBareAnnotations = (text: string, excluded: Set<number>): void => {
  for (let index = 0; index < text.length;) {
    const codePoint = text.codePointAt(index) ?? 0;
    const length = codePoint > 0xffff ? 2 : 1;
    const char = String.fromCodePoint(codePoint);
    if ((char === "#" || char === "@") && !excluded.has(index)) {
      excluded.add(index);
      let cursor = index + length;
      while (cursor < text.length) {
        const nextPoint = text.codePointAt(cursor) ?? 0;
        const nextLength = nextPoint > 0xffff ? 2 : 1;
        if (!IS_TAG_CHARACTER.test(String.fromCodePoint(nextPoint))) break;
        for (let at = cursor; at < cursor + nextLength; at++) excluded.add(at);
        cursor += nextLength;
      }
      index = cursor;
      continue;
    }
    index += length;
  }
};

// The longest palindrome the post contains, as the raw text slice to hand
// to the reader. Non-letters are invisible to the checker (it pairs only
// letters); facet annotations — and bare #/@ tokens — break the text into
// segments so their letters never join, and the slice never spans one.
// Punctuation hugging the palindrome is kept: "topa?" keeps its question
// mark.
export const extractPalindrome = (
  text: string,
  ranges: readonly FacetRange[] = [],
): string | null => {
  const excluded = facetExclusions(text, ranges);
  excludeBareAnnotations(text, excluded);

  const segments: Letter[][] = [];
  let segment: Letter[] = [];
  let inAnnotation = false;

  for (let index = 0; index < text.length;) {
    const codePoint = text.codePointAt(index) ?? 0;
    const length = codePoint > 0xffff ? 2 : 1;
    const isExcluded = excluded.has(index);
    if (isExcluded) {
      // an annotation ends the current run of plain letters
      if (!inAnnotation && segment.length > 0) {
        segments.push(segment);
        segment = [];
      }
      inAnnotation = true;
    } else {
      inAnnotation = false;
      const normalized = normalizeText(String.fromCodePoint(codePoint));
      if (normalized !== "" && isLetter(normalized)) {
        segment.push({ char: normalized, start: index, end: index + length });
      }
    }
    index += length;
  }
  if (segment.length > 0) segments.push(segment);

  let best: { letters: Letter[]; lo: number; hi: number } | null = null;
  for (const letters of segments) {
    const [lo, hi] = longestPalindrome(letters.map((letter) => letter.char));
    if (hi < lo) continue;
    if (!best || hi - lo > best.hi - best.lo) best = { letters, lo, hi };
  }

  if (!best || best.hi - best.lo + 1 < MIN_PALINDROME_LETTERS) return null;
  const first = best.letters[best.lo];
  const last = best.letters[best.hi];

  let start = first.start;
  let end = last.end;

  // grow past adjacent punctuation, stopping at a letter, whitespace, an
  // annotation, or a URL/path slash
  while (start > 0) {
    const code = text.charCodeAt(start - 1);
    const previousStart = code >= 0xdc00 && code <= 0xdfff && start >= 2 ? start - 2 : start - 1;
    const char = text.slice(previousStart, start);
    if (excluded.has(previousStart) || !isHuggingPunctuation(char) || isLoneBracket(char, text)) {
      break;
    }
    start = previousStart;
  }
  while (end < text.length) {
    const codePoint = text.codePointAt(end) ?? 0;
    const nextEnd = end + (codePoint > 0xffff ? 2 : 1);
    const char = text.slice(end, nextEnd);
    if (excluded.has(end) || !isHuggingPunctuation(char) || isLoneBracket(char, text)) break;
    end = nextEnd;
  }

  // then absorb trailing closing punctuation even across whitespace
  // ("topa ?", or a mark on the next line), but never across a blank line,
  // a letter, an opening mark, an annotation, or a tag/URL marker
  for (;;) {
    let cursor = end;
    let newlines = 0;
    let blankLine = false;
    while (cursor < text.length && IS_SPACE.test(text[cursor])) {
      if (IS_NEWLINE.test(text[cursor])) {
        newlines += 1;
        if (newlines > 1) {
          blankLine = true;
          break;
        }
      }
      cursor += 1;
    }
    if (
      blankLine ||
      cursor === end ||
      cursor >= text.length ||
      excluded.has(cursor) ||
      !isClosingPunctuation(text[cursor]) ||
      isLoneBracket(text[cursor], text)
    ) {
      break;
    }
    let mark = cursor;
    while (
      mark < text.length &&
      !excluded.has(mark) &&
      isClosingPunctuation(text[mark]) &&
      !isLoneBracket(text[mark], text)
    ) {
      mark += 1;
    }
    end = mark;
  }

  return text.slice(start, end);
};
