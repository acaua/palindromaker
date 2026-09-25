import { describe, expect, test } from "vite-plus/test";

import { blueskyKeys, dictionaryKey } from "@/queries/query-keys";
import { BSKY_URI } from "@/test/bluesky-post";

describe("bluesky query keys", () => {
  test("owns canonical post, idle, and handle keys", () => {
    expect(blueskyKeys.post(BSKY_URI)).toEqual(["bluesky", "post", BSKY_URI]);
    expect(blueskyKeys.postIdle).toEqual(["bluesky", "post", "idle"]);
    expect(blueskyKeys.handleIdle).toEqual(["bluesky", "handle", "idle"]);
    expect(blueskyKeys.authorFeedIdle).toEqual(["bluesky", "author-feed", "idle"]);
    expect(blueskyKeys.handle("Alice.bsky.social")).toEqual([
      "bluesky",
      "handle",
      "alice.bsky.social",
    ]);
  });

  test("keeps dictionary keys separate", () => {
    expect(dictionaryKey("en")).toEqual(["dictionary", "en"]);
  });
});
