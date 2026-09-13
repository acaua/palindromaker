import { describe, expect, test } from "vite-plus/test";

import {
  MIN_PALINDROME_LETTERS,
  extractPalindrome,
  facetByteRangesToIndices,
} from "@/lib/palindrome-extract";
import type { FacetRange } from "@/lib/palindrome-extract";

const encoder = new TextEncoder();

// the facet range for the first occurrence of `needle` in `text`, in the
// UTF-8 byte offsets Bluesky uses
const rangeOf = (text: string, needle: string): FacetRange => {
  const index = text.indexOf(needle);
  const byteStart = encoder.encode(text.slice(0, index)).length;
  return { byteStart, byteEnd: byteStart + encoder.encode(needle).length };
};

describe("facetByteRangesToIndices", () => {
  test("maps UTF-8 byte offsets onto UTF-16 indices", () => {
    // "aéb": a=1 byte, é=2, b=1 — the é starts at byte 1, not index 1's
    // byte-equivalent once the accent widens it
    const text = "aéb";
    expect(facetByteRangesToIndices(text, [{ byteStart: 1, byteEnd: 3 }])).toEqual([[1, 2]]);
  });

  test("closes the final code point", () => {
    expect(facetByteRangesToIndices("ab", [{ byteStart: 0, byteEnd: 2 }])).toEqual([[0, 2]]);
  });

  test("no ranges means no indices", () => {
    expect(facetByteRangesToIndices("ab", [])).toEqual([]);
  });
});

describe("extractPalindrome", () => {
  test("keeps a whole palindrome, punctuation included", () => {
    expect(extractPalindrome("A man, a plan, a canal: Panama!")).toBe(
      "A man, a plan, a canal: Panama",
    );
  });

  test("finds the palindrome inside a caption and hashtags", () => {
    const text = "My palindrome: A man, a plan, a canal: Panama! #palindrome";
    const tag = rangeOf(text, "#palindrome");
    const result = extractPalindrome(text, [tag]);
    expect(result).toBe("A man, a plan, a canal: Panama");
    expect(result).not.toContain("My palindrome");
  });

  test("ignores an attribution after an embedded palindrome", () => {
    const text = '"Never odd or even", says Ana. #palindrome';
    expect(extractPalindrome(text, [rangeOf(text, "#palindrome")])).toBe("Never odd or even");
  });

  test("accented letters before a facet do not shift the annotation", () => {
    const text = "Élu par cette crapule #palindrome";
    expect(extractPalindrome(text, [rangeOf(text, "#palindrome")])).toBe("Élu par cette crapule");
  });

  test("handles even-length palindromes across punctuation", () => {
    expect(extractPalindrome("ab, ba")).toBe("ab, ba");
  });

  test("a facet splits the text, so a palindrome cannot span it", () => {
    const text = "abc #zzz cba";
    expect(extractPalindrome(text, [rangeOf(text, "#zzz")])).toBeNull();
    // without the annotation the same letters are one palindrome
    expect(extractPalindrome(text)).toBe("abc #zzz cba");
  });

  test("keeps the longest and, on ties, the earliest", () => {
    expect(extractPalindrome("ovo and ana")).toBe("ovo");
  });

  test("rejects palindromes shorter than the minimum", () => {
    expect(extractPalindrome("spoon")).toBeNull();
    expect(extractPalindrome("ana")).not.toBeNull();
    expect(MIN_PALINDROME_LETTERS).toBe(3);
  });
});
