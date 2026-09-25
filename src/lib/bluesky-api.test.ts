import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import {
  RATE_LIMIT_SECONDS,
  clearBlueskyRateLimits,
  fetchAuthorFeed,
  fetchPost,
  resolveHandle,
  searchQueries,
  searchTaggedPosts,
} from "@/lib/bluesky-api";
import { isRestrictedPost } from "@/lib/bluesky-moderation";
import { clearSharedRequests } from "@/lib/shared-request";
import { BSKY_DID as DID, BSKY_URI as URI } from "@/test/bluesky-post";

const OTHER_DID = "did:plc:z72i7hdynmk6r22z27h6tvus";

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

beforeEach(clearBlueskyRateLimits);
afterEach(clearSharedRequests);

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
        author: {
          did: DID,
          handle: "bsky.app",
          displayName: "Bluesky",
          accountLabels: [],
          profileLabels: [],
        },
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
    // throttles are a search concern; here 403/429 are plain errors
    expect(await fetchPost(URI, async () => jsonResponse({}, 403))).toEqual({
      ok: false,
      reason: "error",
    });
    expect(await fetchPost(URI, async () => jsonResponse({}, 429))).toEqual({
      ok: false,
      reason: "error",
    });
    expect(
      await fetchPost(URI, async () => {
        throw new Error("offline");
      }),
    ).toEqual({ ok: false, reason: "error" });
  });

  test("canonicalizes a handle-authority response to the requested DID", async () => {
    const result = await fetchPost(URI, async () =>
      jsonResponse({
        posts: [
          postView({
            uri: "at://alice.bsky.social/app.bsky.feed.post/3kq7aeuwbg42k",
            author: { did: DID, handle: "alice.bsky.social" },
          }),
        ],
      }),
    );

    expect(result).toEqual({ ok: true, value: expect.objectContaining({ uri: URI }) });
  });

  test("drops a handle-authority response whose handle disagrees with the author", async () => {
    const result = await fetchPost(URI, async () =>
      jsonResponse({
        posts: [
          postView({
            uri: "at://mallory.bsky.social/app.bsky.feed.post/3kq7aeuwbg42k",
            author: { did: DID, handle: "alice.bsky.social" },
          }),
        ],
      }),
    );

    expect(result).toEqual({ ok: false, reason: "notFound" });
  });

  test("does not cache a success at the transport seam", async () => {
    const okFetch = vi.fn(async () => jsonResponse({ posts: [postView()] }));
    await fetchPost(URI, okFetch);
    await fetchPost(URI, okFetch);
    expect(okFetch).toHaveBeenCalledTimes(2);

    const other = `${URI}9`;
    const failFetch = vi.fn(async () => jsonResponse({}, 500));
    await fetchPost(other, failFetch);
    await fetchPost(other, failFetch);
    expect(failFetch).toHaveBeenCalledTimes(2);
  });
});

describe("fetchAuthorFeed", () => {
  test("maps the feed wrapper, keeps replies, excludes reposts, and preserves the cursor", async () => {
    const original = postView({ uri: uri("original") });
    const reply = postView({ uri: uri("reply") });
    const reposted = postView({ uri: uri("reposted") });
    const foreign = postView({
      uri: `at://${OTHER_DID}/app.bsky.feed.post/foreign`,
      author: { did: OTHER_DID, handle: "other.example" },
    });
    const foreignRepository = postView({
      uri: `at://${OTHER_DID}/app.bsky.feed.post/foreign-repository`,
    });
    const mismatched = postView({ uri: `at://${OTHER_DID}/app.bsky.feed.post/mismatch` });

    let requestUrl = "";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      return jsonResponse({
        feed: [
          { post: original },
          { post: reply, reply: { root: { uri: original.uri }, parent: { uri: original.uri } } },
          {
            post: reposted,
            reason: { $type: "app.bsky.feed.defs#reasonRepost", by: { did: DID, handle: "other" } },
          },
          {
            post: postView({ uri: uri("pinned") }),
            reason: { $type: "app.bsky.feed.defs#reasonPin" },
          },
          { post: foreign },
          { post: foreignRepository },
          { post: mismatched, reason: { $type: "unknown" } },
        ],
        cursor: "next",
      });
    });

    await expect(fetchAuthorFeed(DID, null, fetchImpl)).resolves.toEqual({
      ok: true,
      value: {
        posts: [original, reply].map((post) => expect.objectContaining({ uri: post.uri })),
        cursor: "next",
      },
    });
    const request = new URL(requestUrl);
    expect(request.searchParams.get("actor")).toBe(DID);
    expect(request.searchParams.get("filter")).toBe("posts_with_replies");
    expect(request.searchParams.get("includePins")).toBe("false");

    expect(request.searchParams.get("limit")).toBe("100");
  });

  test("shares an in-flight page without caching its result", async () => {
    let resolveResponse!: (response: Response) => void;
    const fetchImpl = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    const first = fetchAuthorFeed(DID, null, fetchImpl);
    const second = fetchAuthorFeed(DID, null, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    resolveResponse(jsonResponse({ feed: [{ post: postView() }] }));
    await expect(first).resolves.toEqual({
      ok: true,
      value: { posts: [expect.objectContaining({ uri: URI })], cursor: null },
    });
    await expect(second).resolves.toEqual({
      ok: true,
      value: { posts: [expect.objectContaining({ uri: URI })], cursor: null },
    });

    const third = fetchAuthorFeed(DID, null, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    resolveResponse(jsonResponse({ feed: [{ post: postView() }] }));
    await expect(third).resolves.toEqual({
      ok: true,
      value: { posts: [expect.objectContaining({ uri: URI })], cursor: null },
    });
  });

  test("cancels the physical request after the last consumer aborts", async () => {
    vi.useFakeTimers();
    let physicalSignal: AbortSignal | undefined;
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      physicalSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    });
    const controller = new AbortController();
    const result = fetchAuthorFeed(DID, null, fetchImpl, controller.signal);
    const expectation = expect(result).rejects.toBeDefined();
    controller.abort();
    await vi.runAllTimersAsync();

    await expectation;
    expect(physicalSignal?.aborted).toBe(true);
    vi.useRealTimers();
  });

  test("sends the opaque cursor and treats a missing feed as an error", async () => {
    let requestUrl = "";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      return jsonResponse({ cursor: "next" });
    });
    await expect(fetchAuthorFeed(DID, "opaque/cursor", fetchImpl)).resolves.toEqual({
      ok: false,
      reason: "error",
    });
    expect(new URL(requestUrl).searchParams.get("cursor")).toBe("opaque/cursor");
  });

  test("preserves an empty opaque cursor", async () => {
    let requestUrl = "";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      requestUrl =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      return jsonResponse({ feed: [{ post: postView() }] });
    });

    await expect(fetchAuthorFeed(DID, "", fetchImpl)).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
    expect(new URL(requestUrl).searchParams.has("cursor")).toBe(true);
    expect(new URL(requestUrl).searchParams.get("cursor")).toBe("");
  });

  test("maps unknown accounts and throttles", async () => {
    await expect(
      fetchAuthorFeed(DID, null, async () => new Response("", { status: 400 })),
    ).resolves.toEqual({ ok: false, reason: "notFound" });
    await expect(
      fetchAuthorFeed(OTHER_DID, null, async () => new Response("", { status: 429 })),
    ).resolves.toEqual(expect.objectContaining({ ok: false, reason: "rateLimited" }));
  });
});

describe("resolveHandle", () => {
  test("returns the DID", async () => {
    expect(await resolveHandle("bsky.app", async () => jsonResponse({ did: DID }))).toEqual({
      ok: true,
      value: DID,
    });
  });

  test("shares an in-flight handle resolution without caching the result", async () => {
    let resolveResponse!: (response: Response) => void;
    let calls = 0;
    const fetchImpl = vi.fn(() => {
      if (calls++ === 0) {
        return new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        });
      }
      return Promise.resolve(jsonResponse({ did: DID }));
    });
    const first = resolveHandle("bsky.app", fetchImpl);
    const second = resolveHandle("bsky.app", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    resolveResponse(jsonResponse({ did: DID }));
    await expect(first).resolves.toEqual({ ok: true, value: DID });
    await expect(second).resolves.toEqual({ ok: true, value: DID });
    await expect(resolveHandle("bsky.app", fetchImpl)).resolves.toEqual({ ok: true, value: DID });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("an unknown handle is notFound, a malformed one is badRequest, a server failure is an error", async () => {
    expect(await resolveHandle("unknown.bsky.social", async () => jsonResponse({}, 404))).toEqual({
      ok: false,
      reason: "notFound",
    });
    expect(
      await resolveHandle("unknown.bsky.social", async () =>
        jsonResponse({ error: "HandleNotFound" }, 400),
      ),
    ).toEqual({ ok: false, reason: "notFound" });
    expect(
      await resolveHandle("unknown.bsky.social", async () =>
        jsonResponse({ error: "InvalidRequest" }, 400),
      ),
    ).toEqual({ ok: false, reason: "notFound" });

    expect(await resolveHandle("bad handle", async () => jsonResponse({}, 400))).toEqual({
      ok: false,
      reason: "badRequest",
    });
    expect(await resolveHandle("unknown.bsky.social", async () => jsonResponse({}, 500))).toEqual({
      ok: false,
      reason: "error",
    });
    // throttles are a search concern; here a 429 is a plain error
    expect(await resolveHandle("unknown.bsky.social", async () => jsonResponse({}, 429))).toEqual({
      ok: false,
      reason: "error",
    });
  });
});

describe("searchTaggedPosts", () => {
  test("maps a successful page", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ posts: [postView()], cursor: "abc" }));
    const result = await searchTaggedPosts("#palindrome", "latest", fetchImpl);
    expect(result).toEqual({ ok: true, value: [expect.objectContaining({ uri: URI })] });

    await searchTaggedPosts("#palindrome", "latest", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("tells a throttle, a bad request and a server error apart", async () => {
    // each status gets its own query: throttle answers are remembered, so
    // reusing a key would serve the first answer again
    expect(
      await searchTaggedPosts("#p-403", "top", async () => new Response("", { status: 403 })),
    ).toEqual(expect.objectContaining({ ok: false, reason: "rateLimited" }));
    expect(
      await searchTaggedPosts("#p-429", "top", async () => new Response("", { status: 429 })),
    ).toEqual(expect.objectContaining({ ok: false, reason: "rateLimited" }));
    expect(
      await searchTaggedPosts("#p-400", "top", async () => new Response("", { status: 400 })),
    ).toEqual({ ok: false, reason: "badRequest" });
    // only 400 is a malformed request; other 4xx are errors, not badRequest
    expect(
      await searchTaggedPosts("#p-401", "top", async () => new Response("", { status: 401 })),
    ).toEqual({ ok: false, reason: "error" });
    // ...including a 404, which is a not-found elsewhere but an error here
    expect(
      await searchTaggedPosts("#p-404", "top", async () => new Response("", { status: 404 })),
    ).toEqual({ ok: false, reason: "error" });
    expect(
      await searchTaggedPosts("#p-503", "top", async () => new Response("", { status: 503 })),
    ).toEqual({ ok: false, reason: "error" });
  });

  test("a failure is not cached, so retry really retries", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 500 }));
    await searchTaggedPosts("#p", "top", fetchImpl);
    await searchTaggedPosts("#p", "top", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test("a throttle is remembered briefly, so retries stop spending", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 429 }));
    expect(await searchTaggedPosts("#p", "top", fetchImpl)).toEqual(
      expect.objectContaining({ ok: false, reason: "rateLimited" }),
    );
    expect(await searchTaggedPosts("#p", "top", fetchImpl)).toEqual(
      expect.objectContaining({ ok: false, reason: "rateLimited" }),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("a remembered throttle expires", async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn(async () => new Response("", { status: 429 }));
      await searchTaggedPosts("#p", "top", fetchImpl);
      expect(fetchImpl).toHaveBeenCalledTimes(1);

      vi.setSystemTime(Date.now() + RATE_LIMIT_SECONDS * 1000 + 1);
      await searchTaggedPosts("#p", "top", fetchImpl);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("isRestrictedPost", () => {
  test("flags adult, author-level, and negated moderation labels", async () => {
    const base = postView();
    const restricted = await fetchPost(URI, async () =>
      jsonResponse({ posts: [postView({ labels: [{ val: "porn" }] })] }),
    );
    expect(restricted.ok && isRestrictedPost(restricted.value)).toBe(true);

    const authorRestricted = await fetchPost(`${URI}2`, async () =>
      jsonResponse({
        posts: [
          postView({
            uri: `${URI}2`,
            author: { ...base.author, labels: [{ val: "!no-unauthenticated" }] },
          }),
        ],
      }),
    );
    expect(authorRestricted.ok && isRestrictedPost(authorRestricted.value)).toBe(true);

    const negated = await fetchPost(`${URI}3`, async () =>
      jsonResponse({
        posts: [
          postView({
            uri: `${URI}3`,
            author: {
              ...base.author,
              labels: [
                {
                  val: "!no-unauthenticated",
                  src: DID,
                  uri: `at://${DID}/app.bsky.actor.profile/self`,
                  cts: "2026-09-08T00:00:00.000Z",
                },
                {
                  val: "!no-unauthenticated",
                  src: DID,
                  uri: `at://${DID}/app.bsky.actor.profile/self`,
                  cts: "2026-09-08T00:01:00.000Z",
                  neg: true,
                },
              ],
            },
          }),
        ],
      }),
    );
    expect(negated.ok && isRestrictedPost(negated.value)).toBe(false);

    const mixedSources = await fetchPost(`${URI}5`, async () =>
      jsonResponse({
        posts: [
          postView({
            uri: `${URI}5`,
            author: {
              ...base.author,
              labels: [
                {
                  val: "porn",
                  src: DID,
                  uri: DID,
                  cts: "2026-09-08T00:00:00.000Z",
                },
                {
                  val: "porn",
                  src: OTHER_DID,
                  uri: DID,
                  cts: "2026-09-08T00:00:00.000Z",
                },
                {
                  val: "porn",
                  src: DID,
                  uri: DID,
                  cts: "2026-09-08T00:01:00.000Z",
                  neg: true,
                },
              ],
            },
          }),
        ],
      }),
    );
    expect(mixedSources.ok && isRestrictedPost(mixedSources.value)).toBe(true);
  });

  test("does not promote profile adult labels to post restrictions", async () => {
    const result = await fetchPost(`${URI}8`, async () =>
      jsonResponse({
        posts: [
          postView({
            uri: `${URI}8`,
            author: {
              ...postView().author,
              labels: [
                {
                  val: "porn",
                  src: DID,
                  uri: `at://${DID}/app.bsky.actor.profile/self`,
                  cts: "2026-09-08T00:00:00.000Z",
                },
              ],
            },
          }),
        ],
      }),
    );

    expect(result.ok && isRestrictedPost(result.value)).toBe(false);
    expect(result.ok && isRestrictedPost(result.value, "accountExplore")).toBe(false);
  });

  test("fails closed when a label container is malformed", async () => {
    const result = await fetchPost(`${URI}9`, async () =>
      jsonResponse({
        posts: [
          postView({
            uri: `${URI}9`,
            labels: {},
            author: { ...postView().author, labels: {} },
          }),
        ],
      }),
    );

    expect(result.ok && isRestrictedPost(result.value)).toBe(true);
    expect(result.ok && isRestrictedPost(result.value, "hashtagExplore")).toBe(false);
  });

  test("does not treat record hashtags as Explore facets", async () => {
    const base = postView();
    const result = await fetchPost(`${URI}4`, async () =>
      jsonResponse({
        posts: [
          postView({
            uri: `${URI}4`,
            record: { ...base.record, facets: [], tags: ["palindrome"] },
          }),
        ],
      }),
    );
    expect(result.ok && result.value.tags).toEqual([]);
  });

  test("resolves label order and expiry conservatively", async () => {
    const reordered = await fetchPost(`${URI}8`, async () =>
      jsonResponse({
        posts: [
          postView({
            uri: `${URI}8`,
            labels: [
              {
                val: "porn",
                src: DID,
                uri: `${URI}8`,
                cts: "2026-09-08T00:02:00.000Z",
                neg: true,
              },
              { val: "porn", src: DID, uri: `${URI}8`, cts: "2026-09-08T00:03:00.000Z" },
            ],
          }),
        ],
      }),
    );
    expect(reordered.ok && isRestrictedPost(reordered.value)).toBe(true);

    const expired = await fetchPost(`${URI}9`, async () =>
      jsonResponse({
        posts: [
          postView({
            uri: `${URI}9`,
            labels: [
              {
                val: "porn",
                src: DID,
                uri: `${URI}9`,
                cts: "2020-01-01T00:00:00.000Z",
                exp: "2020-01-02T00:00:00.000Z",
              },
            ],
          }),
        ],
      }),
    );
    expect(expired.ok && isRestrictedPost(expired.value)).toBe(false);
  });

  test("keeps a positive restriction when the response omits a CID", async () => {
    const result = await fetchPost(`${URI}10`, async () =>
      jsonResponse({
        posts: [
          postView({
            uri: `${URI}10`,
            cid: undefined,
            labels: [
              {
                val: "porn",
                src: DID,
                uri: `${URI}10`,
                cid: "cid-from-label",
                cts: "2026-09-08T00:00:00.000Z",
              },
            ],
          }),
        ],
      }),
    );
    expect(result.ok && isRestrictedPost(result.value)).toBe(true);
  });

  test("does not let a CID-less negation clear a CID-bound positive", async () => {
    const result = await fetchPost(`${URI}11`, async () =>
      jsonResponse({
        posts: [
          postView({
            uri: `${URI}11`,
            cid: undefined,
            labels: [
              {
                val: "porn",
                src: DID,
                uri: `${URI}11`,
                cid: "cid-label",
                cts: "2026-09-08T00:00:00.000Z",
              },
              {
                val: "porn",
                src: DID,
                uri: `${URI}11`,
                cts: "2026-09-08T00:01:00.000Z",
                neg: true,
              },
            ],
          }),
        ],
      }),
    );

    expect(result.ok && isRestrictedPost(result.value)).toBe(true);
  });

  test("maps record labels and scopes author labels explicitly", async () => {
    const base = postView();
    const result = await fetchPost(`${URI}6`, async () =>
      jsonResponse({
        posts: [
          postView({
            uri: `${URI}6`,
            record: { ...base.record, labels: { values: [{ val: "porn" }] } },
            author: { ...base.author, labels: [{ val: "!no-unauthenticated" }] },
          }),
        ],
      }),
    );
    expect(result.ok && result.value.recordLabels).toEqual(["porn"]);
    expect(result.ok && isRestrictedPost(result.value)).toBe(true);
    expect(result.ok && isRestrictedPost(result.value, "accountExplore")).toBe(true);

    const authorOnly = await fetchPost(`${URI}7`, async () =>
      jsonResponse({
        posts: [
          postView({
            uri: `${URI}7`,
            author: {
              ...base.author,
              labels: [{ val: "!no-unauthenticated", uri: DID }],
            },
          }),
        ],
      }),
    );
    expect(authorOnly.ok && isRestrictedPost(authorOnly.value)).toBe(true);
    expect(authorOnly.ok && isRestrictedPost(authorOnly.value, "accountExplore")).toBe(true);
    expect(authorOnly.ok && isRestrictedPost(authorOnly.value, "hashtagExplore")).toBe(false);
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
    // each expectation gets fresh queries: throttle answers are remembered
    expect(
      await searchQueries(["#a", "#b"], "top", async () => new Response("", { status: 403 })),
    ).toEqual(expect.objectContaining({ ok: false, reason: "rateLimited" }));
    expect(
      await searchQueries(["#c", "#d"], "top", async () => new Response("", { status: 401 })),
    ).toEqual({ ok: false, reason: "error" });
    expect(
      await searchQueries(["#e", "#f"], "top", async () => new Response("", { status: 400 })),
    ).toEqual({ ok: false, reason: "badRequest" });
  });
});
