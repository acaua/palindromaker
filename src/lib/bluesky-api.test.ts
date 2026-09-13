import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

import {
  clearBlueskyCache,
  fetchPost,
  isRestrictedPost,
  resolveHandle,
  resolvePostRef,
  searchQueries,
  searchTaggedPosts,
} from "@/lib/bluesky-api";
import { BSKY_DID as DID, BSKY_RKEY as RKEY, BSKY_URI as URI } from "@/test/bluesky-post";

const postView = (overrides: Record<string, unknown> = {}) => ({
  uri: URI,
  cid: "bafyreicid",
  author: {
    did: DID,
    handle: "bsky.app",
    displayName: "Bluesky",
    // the API sends an avatar; the app deliberately does not use it, so it
    // never becomes a third outbound image host
    avatar: "https://cdn.example/avatar.jpg",
  },
  record: {
    $type: "app.bsky.feed.post",
    text: "Uau! #palindrome",
    createdAt: "2026-09-08T00:00:00.000Z",
    facets: [
      {
        index: { byteStart: 5, byteEnd: 16 },
        features: [{ $type: "app.bsky.richtext.facet#tag", tag: "palindrome" }],
      },
    ],
  },
  labels: [],
  likeCount: 3,
  repostCount: 1,
  replyCount: 2,
  ...overrides,
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(clearBlueskyCache);

describe("fetchPost", () => {
  test("maps the fields the app uses, without the avatar", async () => {
    const result = await fetchPost(URI, async () => jsonResponse({ posts: [postView()] }));

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        uri: URI,
        text: "Uau! #palindrome",
        tags: ["palindrome"],
        facetRanges: [{ byteStart: 5, byteEnd: 16 }],
        labels: [],
        createdAt: "2026-09-08T00:00:00.000Z",
        likeCount: 3,
        author: { did: DID, handle: "bsky.app", displayName: "Bluesky" },
      }),
    });
  });

  test("an empty or missing post is notFound, a malformed request is badRequest", async () => {
    expect(await fetchPost(URI, async () => jsonResponse({ posts: [] }))).toEqual({
      ok: false,
      reason: "notFound",
    });
    expect(await fetchPost(URI, async () => jsonResponse({}, 404))).toEqual({
      ok: false,
      reason: "notFound",
    });
    expect(await fetchPost(URI, async () => jsonResponse({}, 400))).toEqual({
      ok: false,
      reason: "badRequest",
    });
  });

  test("a server failure is an error", async () => {
    expect(await fetchPost(URI, async () => jsonResponse({}, 500))).toEqual({
      ok: false,
      reason: "error",
    });
    expect(
      await fetchPost(URI, async () => {
        throw new Error("offline");
      }),
    ).toEqual({ ok: false, reason: "error" });
  });

  test("caches a success but never a failure", async () => {
    const okFetch = vi.fn(async () => jsonResponse({ posts: [postView()] }));
    await fetchPost(URI, okFetch);
    await fetchPost(URI, okFetch);
    expect(okFetch).toHaveBeenCalledTimes(1);

    const other = `${URI}9`;
    const failFetch = vi.fn(async () => jsonResponse({}, 500));
    await fetchPost(other, failFetch);
    await fetchPost(other, failFetch);
    expect(failFetch).toHaveBeenCalledTimes(2);
  });
});

describe("resolveHandle", () => {
  test("returns the DID", async () => {
    expect(await resolveHandle("bsky.app", async () => jsonResponse({ did: DID }))).toEqual({
      ok: true,
      value: DID,
    });
  });

  test("an unknown handle is notFound, a malformed one is badRequest, a server failure is an error", async () => {
    expect(await resolveHandle("nope", async () => jsonResponse({}, 404))).toEqual({
      ok: false,
      reason: "notFound",
    });
    expect(await resolveHandle("bad handle", async () => jsonResponse({}, 400))).toEqual({
      ok: false,
      reason: "badRequest",
    });
    expect(await resolveHandle("nope", async () => jsonResponse({}, 500))).toEqual({
      ok: false,
      reason: "error",
    });
  });
});

describe("resolvePostRef", () => {
  test("an at-uri is its own answer, with no request", async () => {
    const fetchImpl = vi.fn();
    expect(await resolvePostRef({ kind: "uri", uri: URI }, fetchImpl)).toEqual({
      ok: true,
      value: URI,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("a handle ref resolves the DID and builds the at-uri", async () => {
    expect(
      await resolvePostRef({ kind: "handle", handle: "bsky.app", rkey: RKEY }, async () =>
        jsonResponse({ did: DID }),
      ),
    ).toEqual({ ok: true, value: URI });
  });

  test("a failed handle resolution is passed through", async () => {
    expect(
      await resolvePostRef({ kind: "handle", handle: "nope", rkey: "3abc" }, async () =>
        jsonResponse({}, 404),
      ),
    ).toEqual({ ok: false, reason: "notFound" });
  });
});

describe("searchTaggedPosts", () => {
  test("maps and caches a successful page", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ posts: [postView()], cursor: "abc" }));
    const result = await searchTaggedPosts("#palindrome", "latest", fetchImpl);
    expect(result).toEqual({ ok: true, value: [expect.objectContaining({ uri: URI })] });

    await searchTaggedPosts("#palindrome", "latest", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("tells a throttle, a bad request and a server error apart", async () => {
    expect(
      await searchTaggedPosts("#p", "top", async () => new Response("", { status: 403 })),
    ).toEqual({ ok: false, reason: "rateLimited" });
    expect(
      await searchTaggedPosts("#p", "top", async () => new Response("", { status: 429 })),
    ).toEqual({ ok: false, reason: "rateLimited" });
    expect(
      await searchTaggedPosts("#p", "top", async () => new Response("", { status: 400 })),
    ).toEqual({ ok: false, reason: "badRequest" });
    // only 400 is a malformed request; other 4xx are errors, not badRequest
    expect(
      await searchTaggedPosts("#p", "top", async () => new Response("", { status: 401 })),
    ).toEqual({ ok: false, reason: "error" });
    expect(
      await searchTaggedPosts("#p", "top", async () => new Response("", { status: 503 })),
    ).toEqual({ ok: false, reason: "error" });
  });

  test("a failure is not cached, so retry really retries", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 403 }));
    await searchTaggedPosts("#p", "top", fetchImpl);
    await searchTaggedPosts("#p", "top", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("isRestrictedPost", () => {
  test("flags adult and logged-out labels", async () => {
    const restricted = await fetchPost(URI, async () =>
      jsonResponse({ posts: [postView({ labels: [{ val: "porn" }] })] }),
    );
    expect(restricted.ok && isRestrictedPost(restricted.value)).toBe(true);

    const clear = await fetchPost(`${URI}2`, async () =>
      jsonResponse({ posts: [postView({ uri: `${URI}2` })] }),
    );
    expect(clear.ok && isRestrictedPost(clear.value)).toBe(false);
  });
});

const uri = (rkey: string) => `at://${DID}/app.bsky.feed.post/${rkey}`;

const queryOf = (input: URL | RequestInfo): string => {
  const url = input instanceof URL ? input.href : typeof input === "string" ? input : input.url;
  return new URL(url).searchParams.get("q") ?? "";
};

describe("searchQueries", () => {
  test("merges the per-query pages, deduped, one request each", async () => {
    const seen: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const q = queryOf(input);
      seen.push(q);
      return q === "#a"
        ? jsonResponse({ posts: [postView({ uri: uri("a") }), postView({ uri: uri("both") })] })
        : jsonResponse({ posts: [postView({ uri: uri("both") }), postView({ uri: uri("b") })] });
    };

    const result = await searchQueries(["#a", "#b"], "top", fetchImpl);

    expect(seen).toEqual(["#a", "#b"]);
    expect(result).toEqual({
      ok: true,
      value: [uri("a"), uri("both"), uri("b")].map((u) => expect.objectContaining({ uri: u })),
    });
  });

  test("a partial throttle still returns what succeeded", async () => {
    const fetchImpl: typeof fetch = async (input) =>
      queryOf(input) === "#a"
        ? jsonResponse({ posts: [postView()] })
        : new Response("", { status: 403 });

    expect(await searchQueries(["#a", "#b"], "top", fetchImpl)).toEqual({
      ok: true,
      value: [expect.objectContaining({ uri: URI })],
    });
  });

  test("all throttled is rateLimited, all failing is an error, 400 is badRequest", async () => {
    expect(
      await searchQueries(["#a", "#b"], "top", async () => new Response("", { status: 403 })),
    ).toEqual({ ok: false, reason: "rateLimited" });
    expect(
      await searchQueries(["#a", "#b"], "top", async () => new Response("", { status: 401 })),
    ).toEqual({ ok: false, reason: "error" });
    expect(
      await searchQueries(["#a", "#b"], "top", async () => new Response("", { status: 400 })),
    ).toEqual({ ok: false, reason: "badRequest" });
  });
});
