import { describe, expect, test } from "vitest";

import { buildDictionary, mirrorWord, searchWords } from "./dictionary";

const dictionary = buildDictionary(
  ["casa", "saúde", "asa", "Azul", "massa", "abacate"].join("\n"),
);

describe("buildDictionary", () => {
  test("splits lines and skips empty ones", () => {
    expect(dictionary.words).toEqual([
      "casa",
      "saúde",
      "asa",
      "Azul",
      "massa",
      "abacate",
    ]);
  });

  test("builds normalized forms for matching", () => {
    expect(dictionary.normalized).toEqual([
      "casa",
      "saude",
      "asa",
      "azul",
      "massa",
      "abacate",
    ]);
  });
});

describe("searchWords", () => {
  test("returns nothing for an empty query", () => {
    expect(searchWords(dictionary, "", "contains")).toEqual([]);
    expect(searchWords(dictionary, "   ", "starts")).toEqual([]);
  });

  test("matches words that start with the query", () => {
    expect(searchWords(dictionary, "as", "starts")).toEqual(["asa"]);
  });

  test("matches words that end with the query", () => {
    expect(searchWords(dictionary, "asa", "ends")).toEqual(["casa", "asa"]);
  });

  test("matches words that contain the query", () => {
    expect(searchWords(dictionary, "s", "contains")).toEqual([
      "casa",
      "saúde",
      "asa",
      "massa",
    ]);
  });

  test("is accent-insensitive", () => {
    expect(searchWords(dictionary, "saude", "starts")).toEqual(["saúde"]);
    expect(searchWords(dictionary, "SAÚDE", "starts")).toEqual(["saúde"]);
  });

  test("is case-insensitive", () => {
    expect(searchWords(dictionary, "azul", "starts")).toEqual(["Azul"]);
    expect(searchWords(dictionary, "AZUL", "contains")).toEqual(["Azul"]);
  });
});

describe("mirrorWord", () => {
  test("reverses the word keeping accents in place", () => {
    expect(mirrorWord("casa")).toBe("asac");
    expect(mirrorWord("lápis")).toBe("sipál");
    expect(mirrorWord("ábaco")).toBe("ocabá");
  });

  test("reverses a palindrome to itself", () => {
    expect(mirrorWord("arara")).toBe("arara");
  });
});
