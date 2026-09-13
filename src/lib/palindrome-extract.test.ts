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
  test("keeps a whole palindrome, trailing punctuation included", () => {
    expect(extractPalindrome("A man, a plan, a canal: Panama!")).toBe(
      "A man, a plan, a canal: Panama!",
    );
  });

  test("finds the palindrome inside a caption and hashtags", () => {
    const text = "My palindrome: A man, a plan, a canal: Panama! #palindrome";
    const tag = rangeOf(text, "#palindrome");
    const result = extractPalindrome(text, [tag]);
    expect(result).toBe("A man, a plan, a canal: Panama!");
    expect(result).not.toContain("My palindrome");
    expect(result).not.toContain("#palindrome");
  });

  test("ignores an attribution after an embedded palindrome", () => {
    const text = '"Never odd or even", says Ana. #palindrome';
    expect(extractPalindrome(text, [rangeOf(text, "#palindrome")])).toBe('"Never odd or even",');
  });

  test("keeps hugging marks, and trailing closing marks across a space", () => {
    expect(extractPalindrome('"abc cba"')).toBe('"abc cba"');
    expect(extractPalindrome("(abc cba)")).toBe("(abc cba)");
    expect(extractPalindrome("abc cba ?")).toBe("abc cba ?");
    expect(extractPalindrome("abc cba   ...")).toBe("abc cba   ...");
    // a closer with no opener is not part of the palindrome
    expect(extractPalindrome("abc cba)")).toBe("abc cba");
  });

  test("never absorbs an opening construct, crosses one line but not a blank", () => {
    expect(extractPalindrome("abc cba (revisão)")).toBe("abc cba");
    expect(extractPalindrome('abc cba "next"')).toBe("abc cba");
    expect(extractPalindrome("abc cba\n?")).toBe("abc cba\n?");
    expect(extractPalindrome("abc cba\n\n#tag")).toBe("abc cba");
  });

  test("ignores bare hashtags and mentions, even without facets", () => {
    expect(extractPalindrome("abc cba#tag")).toBe("abc cba");
    expect(extractPalindrome("abc cba @user.bsky.social")).toBe("abc cba");
    // an unfaceted tag inside the text cannot join the palindrome either
    expect(extractPalindrome("aba #tag aba") ?? "").not.toContain("#");
    expect(extractPalindrome("abc cba/https://example.com")).toBe("abc cba");
    expect(extractPalindrome("abc cba🎉")).toBe("abc cba");
  });

  test("accented letters before a facet do not shift the annotation", () => {
    const text = "Élu par cette crapule #palindrome";
    expect(extractPalindrome(text, [rangeOf(text, "#palindrome")])).toBe("Élu par cette crapule");
  });

  test("handles even-length palindromes across punctuation", () => {
    expect(extractPalindrome("ab, ba")).toBe("ab, ba");
  });

  test("a hashtag splits the text whether or not it is a facet", () => {
    const text = "abc #zzz cba";
    expect(extractPalindrome(text, [rangeOf(text, "#zzz")])).toBeNull();
    // a bare tag is excluded the same way, so the letters still do not join
    expect(extractPalindrome(text)).toBeNull();
  });

  test("keeps the longest and, on ties, the earliest", () => {
    expect(extractPalindrome("ovo and ana")).toBe("ovo");
  });

  test("rejects palindromes shorter than the minimum", () => {
    expect(extractPalindrome("spoon")).toBeNull();
    expect(extractPalindrome("ana")).not.toBeNull();
    expect(MIN_PALINDROME_LETTERS).toBe(3);
  });

  test("a real post extracts exactly the palindrome, tag excluded", () => {
    // silvazuao.bsky.social/app.bsky.feed.post/3l6qczq56ab23
    const text = [
      "inicialmente escrevi um palíndromo bonitinho mas tava muito comprido pra adaptar. então eu encurtei. mas segue o original",
      "",
      "a potra torta",
      "ai de potro:",
      "o treco torto,",
      "alerta aceso.",
      "se cá atrela:",
      "- ó, troto certo!",
      "ortopedia a trotar",
      "topa?",
      "",
      "#palíndromo",
    ].join("\n");

    const result = extractPalindrome(text, [rangeOf(text, "#palíndromo")]);

    const expected = [
      "a potra torta",
      "ai de potro:",
      "o treco torto,",
      "alerta aceso.",
      "se cá atrela:",
      "- ó, troto certo!",
      "ortopedia a trotar",
      "topa?",
    ].join("\n");
    expect(result).toBe(expected);
  });
});
