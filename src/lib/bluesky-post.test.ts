import { describe, expect, test } from "vite-plus/test";

import {
  atUriFor,
  embedIframeSrc,
  parseAtUri,
  parsePostInput,
  postHash,
  postPageUrl,
  readPostRef,
} from "@/lib/bluesky-post";
import { BSKY_DID as DID, BSKY_RKEY as RKEY, BSKY_URI as URI } from "@/test/bluesky-post";

describe("parsePostInput", () => {
  test("accepts an at-uri", () => {
    expect(parsePostInput(URI)).toEqual({ kind: "uri", uri: URI });
  });

  test("accepts a bsky.app URL and resolves a DID inline", () => {
    expect(parsePostInput(`https://bsky.app/profile/${DID}/post/${RKEY}`)).toEqual({
      kind: "uri",
      uri: URI,
    });
  });

  test("keeps a handle for later resolution", () => {
    expect(parsePostInput("https://bsky.app/profile/alice.bsky.social/post/3abc")).toEqual({
      kind: "handle",
      handle: "alice.bsky.social",
      rkey: "3abc",
    });
  });

  test("tolerates a missing scheme, www and surrounding whitespace", () => {
    expect(parsePostInput(`  www.bsky.app/profile/alice.bsky.social/post/3abc  `)).toEqual({
      kind: "handle",
      handle: "alice.bsky.social",
      rkey: "3abc",
    });
  });

  test("ignores the query string a real post URL may carry", () => {
    expect(
      parsePostInput(`https://bsky.app/profile/alice.bsky.social/post/3abc?ref_src=embed`),
    ).toEqual({ kind: "handle", handle: "alice.bsky.social", rkey: "3abc" });
  });

  test("rejects junk", () => {
    expect(parsePostInput("")).toBeNull();
    expect(parsePostInput("hello world")).toBeNull();
    expect(parsePostInput("https://example.com/profile/a/post/b")).toBeNull();
    expect(parsePostInput(`at://${DID}/app.bsky.feed.like/${RKEY}`)).toBeNull();
  });
});

describe("share link", () => {
  test("round-trips through the #b= fragment", () => {
    const url = `https://palindromaker.app/p#${postHash(URI)}`;
    expect(readPostRef(url.slice(url.indexOf("#")))).toEqual({ kind: "uri", uri: URI });
  });

  test("accepts the fragment with and without the leading #", () => {
    expect(readPostRef(`b=${encodeURIComponent(URI)}`)).toEqual({ kind: "uri", uri: URI });
    expect(readPostRef(`#b=${encodeURIComponent(URI)}`)).toEqual({ kind: "uri", uri: URI });
  });

  test("re-reads a bsky.app URL handed in by hand", () => {
    expect(
      readPostRef(`#b=${encodeURIComponent(`https://bsky.app/profile/${DID}/post/${RKEY}`)}`),
    ).toEqual({ kind: "uri", uri: URI });
  });

  test("rejects foreign or malformed fragments", () => {
    expect(readPostRef("")).toBeNull();
    expect(readPostRef("#")).toBeNull();
    expect(readPostRef("#t=abc")).toBeNull();
    expect(readPostRef("#b=")).toBeNull();
    expect(readPostRef("#b=not-a-post")).toBeNull();
    expect(readPostRef("#b=abc&lang=pt")).toBeNull();
    expect(readPostRef("#b=%80")).toBeNull();
  });

  test("reads window.location.hash when no fragment is given", () => {
    // node project: no window, so the guarded default finds nothing
    expect(readPostRef()).toBeNull();
  });
});

describe("parseAtUri", () => {
  test("reads the DID and record key, rejecting other records", () => {
    expect(parseAtUri(URI)).toEqual({ did: DID, rkey: RKEY });
    expect(parseAtUri(`at://${DID}/app.bsky.feed.like/${RKEY}`)).toBeNull();
    expect(parseAtUri("not-a-uri")).toBeNull();
  });
});

describe("embedIframeSrc", () => {
  test("drops the at:// prefix and carries the id and ref_url", () => {
    const url = new URL(embedIframeSrc(URI, "abc", "https://palindromaker.app/p"));
    expect(url.pathname).toBe(`/embed/${DID}/app.bsky.feed.post/${RKEY}`);
    expect(url.searchParams.get("id")).toBe("abc");
    // embed.js encodes ref_url into the param, so the iframe's own
    // URLSearchParams decodes it to the percent-encoded URL (not the raw one)
    expect(url.searchParams.get("ref_url")).toBe(encodeURIComponent("https://palindromaker.app/p"));
  });
});

describe("postPageUrl", () => {
  test("prefers the handle, falls back to the DID", () => {
    expect(postPageUrl(URI, "bsky.app")).toBe(`https://bsky.app/profile/bsky.app/post/${RKEY}`);
    expect(postPageUrl(URI)).toBe(`https://bsky.app/profile/${DID}/post/${RKEY}`);
  });
});

describe("atUriFor", () => {
  test("builds the record uri", () => {
    expect(atUriFor(DID, RKEY)).toBe(URI);
  });
});
