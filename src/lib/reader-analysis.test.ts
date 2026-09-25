import { describe, expect, test } from "vite-plus/test";

import { analyzeReaderText } from "@/lib/reader-analysis";

const values = (raw: string) =>
  analyzeReaderText(raw)
    .lines.flatMap((line) => line.graphemes)
    .map((grapheme) => grapheme.value);

const byValue = (raw: string, value: string) =>
  analyzeReaderText(raw)
    .lines.flatMap((line) => line.graphemes)
    .filter((grapheme) => grapheme.value === value);

describe("analyzeReaderText", () => {
  test("pairs an even palindrome and marks the center halves", () => {
    const analysis = analyzeReaderText("A b, b a");

    expect(analysis.isPalindrome).toBe(true);
    expect(analysis.hasLetters).toBe(true);
    // outermost pair first, center pair last; graphemes are the flat reading
    // indexes (A=0, b=2, b=5, a=7), so the pairs are (0,7) then (2,5)
    expect(analysis.steps.map((step) => step.center)).toEqual([false, true]);
    // an even palindrome has no lone center: the innermost step is a pair
    expect(analysis.steps.map((step) => step.loneCenter)).toEqual([false, false]);
    expect(analysis.steps[0].graphemes).toEqual([0, 7]);
    expect(analysis.steps[1].graphemes).toEqual([2, 5]);

    const center = byValue("A b, b a", "b").filter((grapheme) => grapheme.role.center);
    expect(center.map((grapheme) => grapheme.role.center)).toEqual(["left", "right"]);
  });

  test("a lone odd center is its own mirror and marks both halves", () => {
    const analysis = analyzeReaderText("abcba");

    // three steps: (a,a), (b,b), then the lone c in the middle
    expect(analysis.steps.map((step) => step.graphemes)).toEqual([[0, 4], [1, 3], [2]]);
    expect(analysis.steps.at(-1)?.center).toBe(true);
    expect(analysis.steps.at(-1)?.loneCenter).toBe(true);
    expect(analysis.steps.map((step) => step.loneCenter)).toEqual([false, false, true]);
    const center = byValue("abcba", "c")[0];
    expect(center.role.center).toBe("both");
  });

  test("keeps empty and multiline paragraphs and pairs across them", () => {
    const analysis = analyzeReaderText("A b\n\nb a");

    expect(analysis.lines.map((line) => line.graphemes.length)).toEqual([3, 0, 3]);
    // the separators are not letters and take no part
    expect(analysis.isPalindrome).toBe(true);
    expect(analysis.steps).toHaveLength(2);
  });

  test("reads accents like the checker: precomposed and decomposed agree", () => {
    const precomposed = analyzeReaderText("A grama é amarga");
    const decomposed = analyzeReaderText("A grama e\u0301 amarga");

    expect(precomposed.isPalindrome).toBe(true);
    expect(decomposed.isPalindrome).toBe(true);
    // a combining mark adds no grapheme: the two spellings produce the same steps
    expect(decomposed.steps).toEqual(precomposed.steps);
  });

  test("preserves astral and ZWJ emoji as single graphemes", () => {
    const family = "👨‍👩‍👧";
    const raw = `${family}abba${family}`;

    expect(values(raw)).toEqual([family, "a", "b", "b", "a", family]);
    expect(analyzeReaderText(raw).isPalindrome).toBe(true);
    // emoji carry no letters
    expect(analyzeReaderText(raw).steps[0].graphemes).toEqual([1, 4]);
  });

  test("a non-palindrome gets no steps and a gap over the disagreeing span", () => {
    const analysis = analyzeReaderText("hello world");

    expect(analysis.isPalindrome).toBe(false);
    expect(analysis.steps).toEqual([]);
    // "h" through "d" are all unpaired
    expect(analysis.lines[0].graphemes.every((grapheme) => grapheme.role.gap)).toBe(true);
  });

  test("a center can survive a gap around it", () => {
    const analysis = analyzeReaderText("abca");

    expect(analysis.isPalindrome).toBe(false);
    expect(analysis.steps).toEqual([]);
    expect(byValue("abca", "a").map((grapheme) => grapheme.role.center)).toEqual(["left", "right"]);
    expect(byValue("abca", "b")[0].role.gap).toBe(true);
  });

  test("punctuation-only and empty text have no letters", () => {
    for (const raw of ["", "!!!", "   "]) {
      const analysis = analyzeReaderText(raw);
      expect(analysis.hasLetters).toBe(false);
      expect(analysis.steps).toEqual([]);
    }
  });
});
