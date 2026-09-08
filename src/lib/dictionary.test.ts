import { afterEach, describe, expect, test, vi } from "vitest";

import {
  buildDictionary,
  buildDictionaryIncrementally,
  LANGUAGES,
  loadDictionary,
  mirrorMatch,
  mirrorWord,
  searchWords,
} from "./dictionary";

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

  test("builds a set of normalized forms for mirror lookups", () => {
    expect(dictionary.normalizedSet).toEqual(
      new Set(["casa", "saude", "asa", "azul", "massa", "abacate"]),
    );
  });

  test("dedupes words that normalize to the same form", () => {
    const deduped = buildDictionary("casa\nCasa\ncasa\nasa");

    expect(deduped.words).toEqual(["casa", "asa"]);
    expect(deduped.normalized).toEqual(["casa", "asa"]);
    expect(deduped.normalizedSet).toEqual(new Set(["casa", "asa"]));
  });

  test("handles blank lines and either kind of ending", () => {
    expect(buildDictionary("").words).toEqual([]);
    expect(buildDictionary("casa").words).toEqual(["casa"]);
    expect(buildDictionary("casa\n").words).toEqual(["casa"]);
    expect(buildDictionary("casa\n\nasa\n").words).toEqual(["casa", "asa"]);
  });
});

describe("buildDictionaryIncrementally", () => {
  // more lines than fit in one slice, so the build has to resume
  const many = Array.from({ length: 45_000 }, (_, i) => `word${i}`).join("\n");
  const immediately = () => Promise.resolve();

  test("produces the same dictionary as the blocking build", async () => {
    expect(await buildDictionaryIncrementally(many, immediately)).toEqual(
      buildDictionary(many),
    );
  });

  test("hands control back between slices", async () => {
    let yields = 0;
    await buildDictionaryIncrementally(many, () => {
      yields += 1;
      return Promise.resolve();
    });

    expect(yields).toBeGreaterThan(0);
  });

  test("a short word list needs no slicing at all", async () => {
    let yields = 0;
    const dictionary = await buildDictionaryIncrementally("casa\nasa", () => {
      yields += 1;
      return Promise.resolve();
    });

    expect(yields).toBe(0);
    expect(dictionary.words).toEqual(["casa", "asa"]);
  });
});

describe("searchWords", () => {
  test("returns nothing for an empty query", () => {
    expect(searchWords(dictionary, "", "contains")).toEqual([]);
    expect(searchWords(dictionary, "   ", "starts")).toEqual([]);
  });

  test("ignores spaces around the query", () => {
    // entries are single words, so a stray space is a typing artefact
    expect(searchWords(dictionary, " casa ", "starts")).toEqual(["casa"]);
    expect(searchWords(dictionary, "asa ", "ends")).toEqual(["casa", "asa"]);
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

describe("mirrorMatch", () => {
  const words = buildDictionary(["amor", "roma", "arara", "médio"].join("\n"));

  test("marks words whose mirror is also a word", () => {
    expect(mirrorMatch(words, "amor")).toBe("pair");
    expect(mirrorMatch(words, "oidem")).toBe("pair");
  });

  test("is case-insensitive", () => {
    expect(mirrorMatch(words, "Amor")).toBe("pair");
    expect(mirrorMatch(words, "ARARA")).toBe("palindrome");
  });

  test("marks words that are themselves palindromes", () => {
    expect(mirrorMatch(words, "arara")).toBe("palindrome");
  });

  test("returns null when the mirror is not a word", () => {
    expect(mirrorMatch(words, "casa")).toBeNull();
  });
});

describe("LANGUAGES", () => {
  test("lists all supported dictionaries with pt-br first", () => {
    expect(LANGUAGES.map((info) => info.code)).toEqual([
      "pt-br",
      "en",
      "es",
      "de",
      "fr",
      "it",
    ]);
  });

  test("has unique dictionary files", () => {
    const files = LANGUAGES.map((info) => info.file);
    expect(new Set(files).size).toBe(files.length);
    expect(files.every((file) => file.startsWith("/dictionary/"))).toBe(true);
  });
});

describe("loadDictionary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("requests the file of the requested language", async () => {
    const fetchMock = vi.fn(async () => new Response("x\n", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await loadDictionary("de");

    expect(fetchMock).toHaveBeenCalledWith("/dictionary/de.txt");
  });

  test("caches the dictionary per language", async () => {
    const fetchMock = vi.fn(
      async () => new Response("a\nb\n", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = await loadDictionary("en");
    const second = await loadDictionary("en");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  test("retries after a failed load", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => new Response("", { status: 500 }))
      .mockImplementation(async () => new Response("a\n", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadDictionary("es")).rejects.toThrow();
    await expect(loadDictionary("es")).resolves.toEqual({
      words: ["a"],
      normalized: ["a"],
      normalizedSet: new Set(["a"]),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
