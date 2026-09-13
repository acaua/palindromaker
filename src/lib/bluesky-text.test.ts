import { describe, expect, test } from "vite-plus/test";

import { splitAnnotations } from "@/lib/bluesky-text";
import type { FacetRange } from "@/lib/palindrome-extract";

const encoder = new TextEncoder();

const rangeOf = (text: string, needle: string): FacetRange => {
  const at = text.indexOf(needle);
  const byteStart = encoder.encode(text.slice(0, at)).length;
  return { byteStart, byteEnd: byteStart + encoder.encode(needle).length };
};

describe("splitAnnotations", () => {
  test("no ranges leaves one plain segment", () => {
    expect(splitAnnotations("hello", [])).toEqual([{ start: 0, text: "hello", annotation: false }]);
  });

  test("marks the tag span", () => {
    const text = "Uau! #palindrome";
    expect(splitAnnotations(text, [rangeOf(text, "#palindrome")])).toEqual([
      { start: 0, text: "Uau! ", annotation: false },
      { start: 5, text: "#palindrome", annotation: true },
    ]);
  });

  test("an accented letter before the span does not shift it", () => {
    const text = "Élu #palindrome";
    const segments = splitAnnotations(text, [rangeOf(text, "#palindrome")]);
    expect(segments.map((segment) => segment.annotation)).toEqual([false, true]);
    expect(segments[1].text).toBe("#palindrome");
  });
});
