import { describe, expect, test } from "vitest";

import { NAV_ENTRIES } from "@/lib/navigation";
import { messages, UI_LANGUAGES } from "@/lib/i18n";

describe("navigation table", () => {
  // the header maps over NAV_ENTRIES, so a label missing from any table
  // would render an empty link there
  test("every entry has a label in every UI language", () => {
    for (const lang of UI_LANGUAGES) {
      for (const { labelKey } of NAV_ENTRIES) {
        expect(messages[lang][labelKey].length).toBeGreaterThan(0);
      }
    }
  });

  test("paths are unique absolute routes", () => {
    const paths = NAV_ENTRIES.map(({ path }) => path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      expect(path.startsWith("/")).toBe(true);
    }
  });
});
