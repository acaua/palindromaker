import { describe, expect, test } from "vite-plus/test";

import { formatRelativeTime } from "@/lib/relative-time";

const now = Date.parse("2026-09-08T12:00:00.000Z");

describe("formatRelativeTime", () => {
  test("formats past times with automatic wording", () => {
    expect(formatRelativeTime("2026-09-06T12:00:00.000Z", "en", now)).toBe("2 days ago");
    expect(formatRelativeTime("2026-09-07T12:00:00.000Z", "en", now)).toBe("yesterday");
    expect(formatRelativeTime("2026-09-08T11:00:00.000Z", "en", now)).toBe("1 hour ago");
  });

  test("follows the UI language's locale", () => {
    const en = formatRelativeTime("2026-09-05T12:00:00.000Z", "en", now);
    const pt = formatRelativeTime("2026-09-05T12:00:00.000Z", "pt", now);
    expect(pt).toContain("3");
    expect(pt).not.toBe(en);
    expect(formatRelativeTime("2026-09-06T12:00:00.000Z", "de", now)).not.toBe("");
  });

  test("an unparseable timestamp yields an empty string", () => {
    expect(formatRelativeTime("", "en", now)).toBe("");
    expect(formatRelativeTime("not a date", "en", now)).toBe("");
  });
});
