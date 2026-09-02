import { describe, expect, test } from "vitest";

import checkPalindrome, { normalizeChar } from "./check-palindrome";

describe("isPalindrome", () => {
  test("A man, a plan... is a palindrome", () => {
    const { isPalindrome } = checkPalindrome("A man, a plan, a canal: Panama!");

    expect(isPalindrome).toBe(true);
  });

  test("Abobrinhas não is not a palindrome", () => {
    const { isPalindrome } = checkPalindrome("Abobrinhas não");

    expect(isPalindrome).toBe(false);
  });
});

test("Normalize text", () => {
  const { normalizedText } = checkPalindrome("ãàáéèê :,;?!");

  expect(normalizedText).toEqual("aaaeee :,;?!");
});

describe("normalizeChar", () => {
  test("strips accents from composed characters", () => {
    expect(normalizeChar("é")).toBe("e");
    expect(normalizeChar("Ç")).toBe("c");
    expect(normalizeChar("ã")).toBe("a");
  });

  test("strips accents from decomposed characters", () => {
    expect(normalizeChar("e\u0301")).toBe("e");
  });

  test("drops bare combining marks", () => {
    expect(normalizeChar("\u0301")).toBe("");
  });

  test("leaves non-letters untouched", () => {
    expect(normalizeChar("5")).toBe("5");
    expect(normalizeChar(",")).toBe(",");
    expect(normalizeChar(" ")).toBe(" ");
  });
});

describe("center", () => {
  test("Find separate center", () => {
    const { center } = checkPalindrome("A b, b a");

    expect(center).toEqual([2, 5]);
  });

  test("Find single center", () => {
    const { center } = checkPalindrome("A, b: a!");

    expect(center).toEqual([3, 3]);
  });
});

test("Mirror", () => {
  const { mirror } = checkPalindrome("A b, cb a!");

  expect(mirror).toEqual([
    8,
    undefined,
    6,
    undefined,
    undefined,
    5,
    2,
    undefined,
    0,
    undefined,
  ]);
});

describe("edge cases", () => {
  test("empty string reports the quirk center [0, 0]", () => {
    // current behavior: text[0] is undefined, coerced to "undefined",
    // whose first char "u" counts as a letter and mirrors itself
    const result = checkPalindrome("");

    expect(result.isPalindrome).toBe(true);
    expect(result.center).toEqual([0, 0]);
    expect(result.mirror).toEqual([0]);
    expect(result.normalizedText).toBe("");
  });

  test("string without letters is a palindrome", () => {
    const result = checkPalindrome("!?,.;: 123");

    expect(result.isPalindrome).toBe(true);
    expect(result.center).toBeUndefined();
  });

  test("single letter is a palindrome centered on itself", () => {
    const result = checkPalindrome("a");

    expect(result.isPalindrome).toBe(true);
    expect(result.center).toEqual([0, 0]);
    expect(result.mirror).toEqual([0]);
  });

  test("two different letters are not a palindrome", () => {
    const result = checkPalindrome("ab");

    expect(result.isPalindrome).toBe(false);
    expect(result.center).toBeUndefined();
  });

  test("accented characters are normalized before checking", () => {
    const result = checkPalindrome("áçã");

    expect(result.isPalindrome).toBe(true);
    expect(result.normalizedText).toBe("aca");
    expect(result.center).toEqual([1, 1]);
  });

  test("punctuation between letters is skipped", () => {
    const result = checkPalindrome("ab!a");

    expect(result.isPalindrome).toBe(true);
    expect(result.center).toEqual([1, 1]);
    expect(result.mirror).toEqual([3, 1, undefined, 0]);
  });

  test("spaces and punctuation are skipped when mapping mirrors", () => {
    const result = checkPalindrome("a b!a");

    expect(result.isPalindrome).toBe(true);
    expect(result.center).toEqual([2, 2]);
    expect(result.mirror).toEqual([4, undefined, 2, undefined, 0]);
  });

  test("a failed match after a partial mirror keeps the center", () => {
    const result = checkPalindrome("salamas");

    expect(result.isPalindrome).toBe(false);
    expect(result.center).toEqual([1, 5]);
  });
});
