import { describe, expect, test } from "vite-plus/test";

import {
  BLUESKY_POST_LIMIT,
  blueskyComposeUrl,
  graphemeCount,
  planBlueskyPost,
  planBlueskyShare,
} from "@/lib/bluesky-share";

describe("graphemeCount", () => {
  test("counts graphemes, not code points", () => {
    expect(graphemeCount("abc")).toBe(3);
    // e + combining acute is one grapheme, two code points
    expect(graphemeCount("e\u0301")).toBe(1);
    // a ZWJ family is one grapheme, several code points
    expect(graphemeCount("👨‍👩‍👧‍👦")).toBe(1);
  });

  test("the post limit is a hard boundary", () => {
    expect(graphemeCount("a".repeat(BLUESKY_POST_LIMIT))).toBe(BLUESKY_POST_LIMIT);
    expect(graphemeCount("a".repeat(BLUESKY_POST_LIMIT + 1))).toBe(BLUESKY_POST_LIMIT + 1);
  });
});

describe("blueskyComposeUrl", () => {
  test("encodes the whole text into the text param", () => {
    expect(blueskyComposeUrl("a b\nc&d#e")).toBe(
      `https://bsky.app/intent/compose?text=${encodeURIComponent("a b\nc&d#e")}`,
    );
  });
});

describe("planBlueskyPost", () => {
  const share = "https://x.test/p#t=A%20b%2C%20b%20a";
  const site = "https://x.test/";

  test("prefers the share link, then the root, then the text alone", () => {
    expect(planBlueskyPost("A b, b a", share, site)?.text).toBe(`A b, b a\n\n${share}`);
    expect(planBlueskyPost("x".repeat(280), share, site)?.text).toBe(
      "x".repeat(280) + "\n\n" + site,
    );
    expect(planBlueskyPost("x".repeat(300), share, site)?.text).toBe("x".repeat(300));
  });

  test("is null when even the text alone is over the limit", () => {
    expect(planBlueskyPost("x".repeat(BLUESKY_POST_LIMIT + 1), share, site)).toBeNull();
    expect(planBlueskyPost("   ", share, site)).toBeNull();
  });

  test("carries the composed url", () => {
    const plan = planBlueskyPost("A b, b a", share, site);
    expect(plan?.composeUrl).toBe(blueskyComposeUrl(`A b, b a\n\n${share}`));
  });
});

describe("planBlueskyShare", () => {
  test("builds the share link from the origin", () => {
    const plan = planBlueskyShare("A b, b a", "https://x.test");
    expect(plan?.text).toBe("A b, b a\n\nhttps://x.test/p#t=A%20b%2C%20b%20a");
  });
});
