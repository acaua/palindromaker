import { describe, expect, test } from "vite-plus/test";

import { mirrorWord, mirrorsItself } from "./mirror-word";

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

describe("mirrorsItself", () => {
  test("is true when a word is its own mirror", () => {
    expect(mirrorsItself("arara")).toBe(true);
    expect(mirrorsItself("ARARA")).toBe(true);
  });

  test("is false when the mirror differs", () => {
    expect(mirrorsItself("casa")).toBe(false);
  });
});
