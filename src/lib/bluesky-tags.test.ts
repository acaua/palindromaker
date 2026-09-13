import { describe, expect, test } from "vite-plus/test";

import { PALINDROME_TAGS, isTaggedWith, normalizeTag, tagQuery, tagsFor } from "@/lib/bluesky-tags";
import { UI_LANGUAGES } from "@/lib/i18n";

describe("tag table", () => {
  test("every UI language has tags, all non-empty", () => {
    for (const lang of UI_LANGUAGES) {
      const tags = tagsFor(lang);
      expect(tags.length).toBeGreaterThan(0);
      for (const tag of tags) expect(tag.length).toBeGreaterThan(0);
    }
  });

  test("covers the accented and accentless spelling", () => {
    expect(PALINDROME_TAGS.pt).toContain("palindromo");
    expect(PALINDROME_TAGS.pt).toContain("palíndromo");
    expect(PALINDROME_TAGS.es).toContain("palíndromo");
  });

  test("every tag also carries its accent-stripped twin", () => {
    for (const lang of UI_LANGUAGES) {
      const tags = tagsFor(lang);
      for (const tag of tags) {
        expect(tags).toContain(normalizeTag(tag));
      }
    }
  });

  test("an accented language queries both spellings, one per request", () => {
    for (const lang of ["pt", "es"] as const) {
      const queries = tagsFor(lang).map(tagQuery);
      expect(queries).toContain("#palíndromo");
      expect(queries).toContain("#palindromo");
      // no OR: Bluesky search has no boolean operator
      expect(queries.every((query) => !query.includes("OR"))).toBe(true);
    }
  });
});

describe("tagQuery", () => {
  test("prefixes a single hashtag", () => {
    expect(tagQuery("palindromo")).toBe("#palindromo");
  });
});

describe("normalizeTag", () => {
  test("folds case and accents", () => {
    expect(normalizeTag("Palíndromo")).toBe("palindromo");
    expect(normalizeTag("PALINDROMES")).toBe("palindromes");
  });
});

describe("isTaggedWith", () => {
  const wanted = tagsFor("pt");

  test("accepts a post whose facet tag is in the set", () => {
    expect(isTaggedWith({ tags: ["palíndromo"] }, wanted)).toBe(true);
    expect(isTaggedWith({ tags: ["other", "Palindromo"] }, wanted)).toBe(true);
  });

  test("rejects a post that only mentions the word", () => {
    expect(isTaggedWith({ tags: [] }, wanted)).toBe(false);
    expect(isTaggedWith({ tags: ["palindrome"] }, wanted)).toBe(false);
  });
});
