import { describe, expect, test } from "vite-plus/test";

import checkPalindrome from "@/lib/check-palindrome";
import { UI_LANGUAGES } from "@/lib/i18n";
import { SAMPLE_CONTENT, SAMPLE_CONTENT_PT, sampleContent } from "@/lib/sample";

describe("sample content", () => {
  // every language must open on a real palindrome, not just the en/pt pair
  // the e2e suite asserts on
  test("every language starts on a real palindrome", () => {
    for (const language of UI_LANGUAGES) {
      const { isPalindrome, normalizedText } = checkPalindrome(sampleContent(language));
      expect(normalizedText.length).toBeGreaterThan(0);
      expect(isPalindrome).toBe(true);
    }
  });

  test("the exported constants are the en and pt samples", () => {
    expect(sampleContent("en")).toBe(SAMPLE_CONTENT);
    expect(sampleContent("pt")).toBe(SAMPLE_CONTENT_PT);
  });
});
