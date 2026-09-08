import { describe, expect, test } from "vitest";

import {
  countLettersBefore,
  letterAtDocPos,
  mirrorDeleteDocPos,
  mirrorInsertDocPos,
} from "./mirror-edit";

// letterPositions as produced by analyzeDoc: the doc position of every
// letter, in order, with punctuation and block separators skipped
// (doc-analysis.test.ts checks that these are the arrays it builds)
const aba = [1, 2, 3]; // "aba"
const punctuation = [1, 4]; // "a, a!"
const twoBlocks = [1, 2, 5, 6]; // "ab\nba"

describe("countLettersBefore", () => {
  test("counts only letters before the doc position", () => {
    expect(countLettersBefore(twoBlocks, 0)).toBe(0);
    expect(countLettersBefore(twoBlocks, 1)).toBe(0);
    expect(countLettersBefore(twoBlocks, 4)).toBe(2);
    expect(countLettersBefore(twoBlocks, 6)).toBe(3);
    expect(countLettersBefore(twoBlocks, 7)).toBe(4);
  });

  test("ignores letters without a doc position", () => {
    // a letter a normalization expanded into keeps no position of its own
    expect(countLettersBefore([1, undefined, 3], 4)).toBe(2);
  });
});

describe("letterAtDocPos", () => {
  test("finds the letter starting at a doc position", () => {
    expect(letterAtDocPos(aba, 1)).toBe(0);
    expect(letterAtDocPos(aba, 3)).toBe(2);
  });

  test("returns undefined for non-letter positions", () => {
    // doc position 2 holds the "," of "a, a!"
    expect(letterAtDocPos(punctuation, 2)).toBeUndefined();
  });
});

describe("mirrorInsertDocPos", () => {
  test("insertion at the end mirrors to the start", () => {
    // 3 letters, all before the end of the text
    expect(mirrorInsertDocPos(aba, 3)).toBe(1);
  });

  test("insertion at the start mirrors to after the last letter", () => {
    expect(mirrorInsertDocPos(aba, 0)).toBe(4);
  });

  test("insertion in the middle mirrors around the center", () => {
    expect(mirrorInsertDocPos(aba, 1)).toBe(3);
    expect(mirrorInsertDocPos(aba, 2)).toBe(2);
  });

  test("punctuation between letters does not shift the mirror", () => {
    // letters "aa": typing next to a letter duplicates it adjacently
    expect(mirrorInsertDocPos(punctuation, 1)).toBe(4);
    expect(mirrorInsertDocPos(punctuation, 2)).toBe(1);
    expect(mirrorInsertDocPos(punctuation, 0)).toBe(5);
  });

  test("works across block separators", () => {
    expect(mirrorInsertDocPos(twoBlocks, 2)).toBe(5);
    expect(mirrorInsertDocPos(twoBlocks, 4)).toBe(1);
    expect(mirrorInsertDocPos(twoBlocks, 0)).toBe(7);
  });

  test("empty text has no mirror position", () => {
    expect(mirrorInsertDocPos([], 0)).toBeUndefined();
  });
});

describe("mirrorDeleteDocPos", () => {
  test("deleting an outer letter mirrors to the opposite side", () => {
    expect(mirrorDeleteDocPos(aba, 0)).toBe(3);
    expect(mirrorDeleteDocPos(aba, 2)).toBe(1);
  });

  test("deleting the center letter has no mirror", () => {
    expect(mirrorDeleteDocPos(aba, 1)).toBeUndefined();
  });

  test("works across block separators", () => {
    expect(mirrorDeleteDocPos(twoBlocks, 0)).toBe(6);
    expect(mirrorDeleteDocPos(twoBlocks, 3)).toBe(1);
  });
});
