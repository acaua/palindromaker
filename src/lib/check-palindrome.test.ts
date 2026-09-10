import { describe, expect, test } from "vite-plus/test";

import checkPalindrome, { normalizeText } from "./check-palindrome";

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

describe("normalizeText", () => {
  test("strips accents from composed characters", () => {
    expect(normalizeText("é")).toBe("e");
    expect(normalizeText("Ç")).toBe("c");
    expect(normalizeText("ã")).toBe("a");
  });

  test("strips accents from decomposed characters", () => {
    expect(normalizeText("e\u0301")).toBe("e");
  });

  test("strips combining marks outside the Latin-1 accent range", () => {
    expect(normalizeText("a\u20d0")).toBe("a"); // combining left arrow above
    expect(normalizeText("a\ufe20")).toBe("a"); // combining ligature left half
    expect(normalizeText("a\u1ab0")).toBe("a"); // combining digraph rising
    expect(normalizeText("a\u20d0b")).toBe("ab");
  });

  test("drops bare combining marks", () => {
    expect(normalizeText("\u0301")).toBe("");
  });

  test("leaves non-letters untouched", () => {
    expect(normalizeText("5")).toBe("5");
    expect(normalizeText(",")).toBe(",");
    expect(normalizeText(" ")).toBe(" ");
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

  expect(mirror).toEqual([8, undefined, 6, undefined, undefined, 5, 2, undefined, 0, undefined]);
});

describe("gap", () => {
  test("a palindrome has no gap", () => {
    expect(checkPalindrome("A b, b a").gap).toBeUndefined();
    expect(checkPalindrome("").gap).toBeUndefined();
    expect(checkPalindrome("!?,.;: 123").gap).toBeUndefined();
  });

  test("the gap covers the letters left unpaired after a partial mirror", () => {
    // "s" and "a" pair up, then "l" and "m" disagree
    expect(checkPalindrome("salamas").gap).toEqual([2, 4]);
  });

  test("the gap covers the whole text when no letters pair up", () => {
    expect(checkPalindrome("ab").gap).toEqual([0, 1]);
    expect(checkPalindrome("hello world").gap).toEqual([0, 10]);
  });

  test("the gap ends on letters, not on the punctuation between them", () => {
    // outer "a" pair matches, "b" and "c" disagree; the space is skipped
    expect(checkPalindrome("abc a").gap).toEqual([1, 2]);
  });
});

describe("edge cases", () => {
  test("empty string is a palindrome with no center", () => {
    const result = checkPalindrome("");

    expect(result.isPalindrome).toBe(true);
    expect(result.center).toBeUndefined();
    expect(result.mirror).toEqual([]);
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
    expect(result.gap).toEqual([0, 1]);
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
    expect(result.gap).toEqual([2, 4]);
  });
});
