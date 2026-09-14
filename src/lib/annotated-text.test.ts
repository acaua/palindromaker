import { describe, expect, test } from "vite-plus/test";

import { facetByteRangesToIndices, facetExclusions } from "@/lib/annotated-text";

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

describe("facetExclusions", () => {
  test("collects every index the ranges cover", () => {
    expect(facetExclusions("aéb", [{ byteStart: 1, byteEnd: 3 }])).toEqual(new Set([1]));
  });

  test("no ranges means no exclusions", () => {
    expect(facetExclusions("ab", [])).toEqual(new Set());
  });
});
