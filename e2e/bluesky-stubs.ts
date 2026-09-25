import type { Page } from "@playwright/test";

// Everything the app fetches from Bluesky, stubbed so the e2e suite is
// offline and deterministic. Shared by bluesky.spec.ts and the mobile
// reader spec, which opens a #b= post reader.
export const DID = "did:plc:z72i7hdynmk6r22z27h6tvur";
export const RKEY = "3abc";
export const URI = `at://${DID}/app.bsky.feed.post/${RKEY}`;
export const TEXT = "My favourite: A man, a plan, a canal: Panama! #palindrome";

const tagStart = TEXT.indexOf("#palindrome");
export const post = {
  uri: URI,
  cid: "cid",
  author: { did: DID, handle: "pal.bsky.social", displayName: "Pal" },
  record: {
    $type: "app.bsky.feed.post",
    text: TEXT,
    createdAt: "2026-09-08T00:00:00.000Z",
    facets: [
      {
        index: {
          byteStart: Buffer.byteLength(TEXT.slice(0, tagStart)),
          byteEnd: Buffer.byteLength(TEXT),
        },
        features: [{ $type: "app.bsky.richtext.facet#tag", tag: "palindrome" }],
      },
    ],
  },
  labels: [],
  likeCount: 1,
  repostCount: 0,
  replyCount: 0,
};

// The embed iframe is served a blank page so it never reaches embed.bsky.app.
export const stubEmbed = (page: Page) =>
  page.route("https://embed.bsky.app/**", (route) =>
    route.fulfill({ body: "<!doctype html><title>embed</title>", contentType: "text/html" }),
  );

export const stubGetPosts = (page: Page, posts: unknown[]) =>
  page.route("**/xrpc/app.bsky.feed.getPosts*", (route) => route.fulfill({ json: { posts } }));

export const stubSearch = (page: Page, posts: unknown[], cursor?: string) =>
  page.route("**/xrpc/app.bsky.feed.searchPosts*", (route) =>
    route.fulfill({ json: cursor ? { posts, cursor } : { posts } }),
  );

export const stubAuthorFeed = async (page: Page, first: unknown[], older: unknown[]) => {
  let requests = 0;
  await page.route("**/xrpc/app.bsky.feed.getAuthorFeed*", (route) => {
    requests += 1;
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    return route.fulfill({
      json: cursor
        ? { feed: older.map((item) => ({ post: item })) }
        : { feed: first.map((item) => ({ post: item })), cursor: "older" },
    });
  });
  return () => requests;
};

export const stubResolveHandle = (page: Page) =>
  page.route("**/xrpc/com.atproto.identity.resolveHandle*", (route) =>
    route.fulfill({ json: { did: DID } }),
  );

export const stubBluesky = async (page: Page) => {
  await stubGetPosts(page, [post]);
  await stubSearch(page, [post], "next");
  await stubResolveHandle(page);
  await stubEmbed(page);
};
