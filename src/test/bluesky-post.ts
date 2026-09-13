import type { BlueskyPost } from "@/lib/bluesky-api";

// the identifiers every Bluesky test shares
export const BSKY_DID = "did:plc:z72i7hdynmk6r22z27h6tvur";
export const BSKY_RKEY = "3kq7aeuwbg42k";
export const BSKY_URI = `at://${BSKY_DID}/app.bsky.feed.post/${BSKY_RKEY}`;

// one post shape for every test that needs one
export const makePost = (overrides: Partial<BlueskyPost> = {}): BlueskyPost => ({
  uri: "at://did:plc:x/app.bsky.feed.post/1",
  cid: "cid",
  text: "A man, a plan, a canal: Panama",
  facetRanges: [],
  tags: ["palindrome"],
  labels: [],
  author: { did: "did:plc:x", handle: "a.bsky.social", displayName: "A" },
  createdAt: "2026-09-08T00:00:00.000Z",
  likeCount: 0,
  repostCount: 0,
  replyCount: 0,
  ...overrides,
});
