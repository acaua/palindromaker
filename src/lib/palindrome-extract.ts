import { isLetter, normalizeText } from "@/lib/check-palindrome";

// app.bsky.richtext.facet indexes are UTF-8 byte offsets, while the text
// we hold (and slice) is UTF-16: accented letters widen under encoding.
export interface FacetRange {
  byteStart: number;
  byteEnd: number;
}

// longer than this is more likely an accidental word ("aha", "ovo") than
// a crafted palindrome
export const MIN_PALINDROME_LETTERS = 3;

export const facetByteRangesToIndices = (
  text: string,
  ranges: readonly FacetRange[],
): Array<[number, number]> => {
  if (ranges.length === 0) return [];
  const encoder = new TextEncoder();
  // the UTF-16 index at the start of each code point, with the byte offset
  // it begins at; the final entry closes the last code point
  const boundaries: Array<{ byte: number; index: number }> = [];
  let byte = 0;
  for (let index = 0; index < text.length;) {
    const codePoint = text.codePointAt(index) ?? 0;
    boundaries.push({ byte, index });
    byte += encoder.encode(String.fromCodePoint(codePoint)).length;
    index += codePoint > 0xffff ? 2 : 1;
  }
  boundaries.push({ byte, index: text.length });

  const toIndex = (target: number): number => {
    let result = 0;
    for (const boundary of boundaries) {
      if (boundary.byte <= target) result = boundary.index;
      else break;
    }
    return result;
  };

  return ranges.map(({ byteStart, byteEnd }) => [toIndex(byteStart), toIndex(byteEnd)]);
};

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

// The longest palindrome the post contains. Non-letters (spaces,
// punctuation) are invisible, as in the checker; facet annotations break
// the text into segments so a URL inside the post can never contribute
// letters.
// The raw text slice of the longest palindrome the post contains.
// Non-letters (spaces, punctuation) are invisible, as in the checker;
// facet annotations break the text into segments so a URL inside the post
// can never contribute letters.
export const extractPalindrome = (
  text: string,
  ranges: readonly FacetRange[] = [],
): string | null => {
  const excluded = new Set<number>();
  for (const [start, end] of facetByteRangesToIndices(text, ranges)) {
    for (let index = start; index < end; index++) excluded.add(index);
  }

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
  return text.slice(first.start, last.end);
};
