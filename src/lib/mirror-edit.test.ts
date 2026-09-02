import { describe, expect, test } from "vitest";

import {
  countLettersBefore,
  letterAtDocPos,
  letterIndices,
  mirrorDeleteDocPos,
  mirrorInsertDocPos,
} from "./mirror-edit";

// positions as produced by analyzeDoc: one entry per text character,
// undefined for the "\n" separators between blocks
const cases: Record<
  string,
  { text: string; positions: Array<number | undefined> }
> = {
  aba: { text: "aba", positions: [1, 2, 3] },
  punctuation: { text: "a, a!", positions: [1, 2, undefined, 4, 5] },
  twoBlocks: { text: "ab\nba", positions: [1, 2, undefined, 5, 6] },
};

describe("letterIndices", () => {
  test("skips punctuation and separators", () => {
    expect(letterIndices(cases.punctuation.text)).toEqual([0, 3]);
    expect(letterIndices(cases.twoBlocks.text)).toEqual([0, 1, 3, 4]);
  });

  test("empty text has no letters", () => {
    expect(letterIndices("")).toEqual([]);
  });
});

describe("countLettersBefore", () => {
  test("counts only letters before the doc position", () => {
    const { text, positions } = cases.twoBlocks;
    const letterIdxs = letterIndices(text);

    expect(countLettersBefore(letterIdxs, positions, 0)).toBe(0);
    expect(countLettersBefore(letterIdxs, positions, 1)).toBe(0);
    expect(countLettersBefore(letterIdxs, positions, 4)).toBe(2);
    expect(countLettersBefore(letterIdxs, positions, 6)).toBe(3);
    expect(countLettersBefore(letterIdxs, positions, 7)).toBe(4);
  });
});

describe("letterAtDocPos", () => {
  test("finds the letter starting at a doc position", () => {
    const { text, positions } = cases.aba;
    const letterIdxs = letterIndices(text);

    expect(letterAtDocPos(letterIdxs, positions, 1)).toBe(0);
    expect(letterAtDocPos(letterIdxs, positions, 3)).toBe(2);
  });

  test("returns undefined for non-letter positions", () => {
    const { text, positions } = cases.punctuation;
    const letterIdxs = letterIndices(text);

    expect(letterAtDocPos(letterIdxs, positions, 2)).toBeUndefined();
  });
});

describe("mirrorInsertDocPos", () => {
  test("insertion at the end mirrors to the start", () => {
    const { text, positions } = cases.aba;
    const letterIdxs = letterIndices(text);

    // 3 letters, all before the end of the text
    expect(mirrorInsertDocPos(letterIdxs, positions, 3)).toBe(1);
  });

  test("insertion at the start mirrors to after the last letter", () => {
    const { text, positions } = cases.aba;
    const letterIdxs = letterIndices(text);

    expect(mirrorInsertDocPos(letterIdxs, positions, 0)).toBe(4);
  });

  test("insertion in the middle mirrors around the center", () => {
    const { text, positions } = cases.aba;
    const letterIdxs = letterIndices(text);

    expect(mirrorInsertDocPos(letterIdxs, positions, 1)).toBe(3);
    expect(mirrorInsertDocPos(letterIdxs, positions, 2)).toBe(2);
  });

  test("punctuation between letters does not shift the mirror", () => {
    const { text, positions } = cases.punctuation;
    const letterIdxs = letterIndices(text);

    // letters "aa": typing next to a letter duplicates it adjacently
    expect(mirrorInsertDocPos(letterIdxs, positions, 1)).toBe(4);
    expect(mirrorInsertDocPos(letterIdxs, positions, 2)).toBe(1);
    expect(mirrorInsertDocPos(letterIdxs, positions, 0)).toBe(5);
  });

  test("works across block separators", () => {
    const { text, positions } = cases.twoBlocks;
    const letterIdxs = letterIndices(text);

    expect(mirrorInsertDocPos(letterIdxs, positions, 2)).toBe(5);
    expect(mirrorInsertDocPos(letterIdxs, positions, 4)).toBe(1);
    expect(mirrorInsertDocPos(letterIdxs, positions, 0)).toBe(7);
  });

  test("empty text has no mirror position", () => {
    expect(mirrorInsertDocPos([], [], 0)).toBeUndefined();
  });
});

describe("mirrorDeleteDocPos", () => {
  test("deleting an outer letter mirrors to the opposite side", () => {
    const { text, positions } = cases.aba;
    const letterIdxs = letterIndices(text);

    expect(mirrorDeleteDocPos(letterIdxs, positions, 0)).toBe(3);
    expect(mirrorDeleteDocPos(letterIdxs, positions, 2)).toBe(1);
  });

  test("deleting the center letter has no mirror", () => {
    const { text, positions } = cases.aba;
    const letterIdxs = letterIndices(text);

    expect(mirrorDeleteDocPos(letterIdxs, positions, 1)).toBeUndefined();
  });

  test("works across block separators", () => {
    const { text, positions } = cases.twoBlocks;
    const letterIdxs = letterIndices(text);

    expect(mirrorDeleteDocPos(letterIdxs, positions, 0)).toBe(6);
    expect(mirrorDeleteDocPos(letterIdxs, positions, 3)).toBe(1);
  });
});
