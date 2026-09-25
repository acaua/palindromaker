import { describe, expect, test } from "vite-plus/test";

import { normalizeAccount } from "@/lib/bluesky-account";
import { BSKY_DID } from "@/test/bluesky-post";

describe("normalizeAccount", () => {
  test("accepts handles, @handles, DIDs, and profile URLs", () => {
    expect(normalizeAccount("Alice.bsky.social")).toBe("alice.bsky.social");
    expect(normalizeAccount("@Alice.bsky.social")).toBe("alice.bsky.social");
    expect(normalizeAccount(BSKY_DID)).toBe(BSKY_DID);
    expect(normalizeAccount("did:web:example.com")).toBe("did:web:example.com");
    expect(normalizeAccount("did:web:Example.COM")).toBeNull();
    expect(normalizeAccount("https://bsky.app/profile/alice.bsky.social?ref=shared")).toBe(
      "alice.bsky.social",
    );
    expect(normalizeAccount("bsky.app/profile/alice.bsky.social")).toBe("alice.bsky.social");
    expect(normalizeAccount("www.bsky.app/profile/alice.bsky.social")).toBe("alice.bsky.social");
  });

  test("rejects malformed and foreign values", () => {
    expect(normalizeAccount("")).toBeNull();
    expect(normalizeAccount("hello world")).toBeNull();
    expect(normalizeAccount("https://example.com/profile/alice.bsky.social")).toBeNull();
    expect(normalizeAccount("https://bsky.app/profile/alice.bsky.social/post/1")).toBeNull();
    expect(normalizeAccount("127.0.0.1")).toBeNull();
    expect(normalizeAccount("foo.123")).toBeNull();
    expect(normalizeAccount("http://bsky.app/profile/alice.bsky.social")).toBeNull();
    expect(normalizeAccount("https://user:pass@bsky.app/profile/alice.bsky.social")).toBeNull();
    expect(normalizeAccount("https://bsky.app:8443/profile/alice.bsky.social")).toBeNull();
    expect(normalizeAccount("https://bsky.app/profile/alice%2Fbsky.social")).toBeNull();
    expect(normalizeAccount("DID:PLC:z72i7hdynmk6r22z27h6tvur")).toBeNull();
    expect(normalizeAccount("did:web:example.123")).toBeNull();
    expect(normalizeAccount("did:web:example.local")).toBeNull();
    expect(normalizeAccount("did:web:example.alt")).toBeNull();
    expect(normalizeAccount(`did:web:${"a".repeat(250)}.com`)).toBeNull();
    expect(normalizeAccount("did:plc:abc/extra")).toBeNull();
  });
});
