import { facetByteRangesToIndices } from "@/lib/palindrome-extract";
import type { FacetRange } from "@/lib/palindrome-extract";

export interface TextSegment {
  // where the segment starts in the original UTF-16 string (a stable key)
  start: number;
  text: string;
  // true for a hashtag/link/mention facet span
  annotation: boolean;
}

// Split a post's text into plain and annotation spans, so a card can
// de-emphasize the hashtags without hiding them.
export const splitAnnotations = (text: string, ranges: readonly FacetRange[]): TextSegment[] => {
  const excluded = new Set<number>();
  for (const [start, end] of facetByteRangesToIndices(text, ranges)) {
    for (let index = start; index < end; index++) excluded.add(index);
  }

  const segments: TextSegment[] = [];
  for (let index = 0; index < text.length;) {
    const codePoint = text.codePointAt(index) ?? 0;
    const length = codePoint > 0xffff ? 2 : 1;
    const annotation = excluded.has(index);
    const piece = text.slice(index, index + length);
    const last = segments[segments.length - 1];
    if (last && last.annotation === annotation) {
      last.text += piece;
    } else {
      segments.push({ start: index, text: piece, annotation });
    }
    index += length;
  }
  return segments;
};
