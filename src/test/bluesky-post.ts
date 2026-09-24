import type { BlueskyPost } from "@/lib/bluesky-api";

export const BSKY_DID = "did:plc:z72i7hdynmk6r22z27h6tvur";
export const BSKY_RKEY = "3kq7aeuwbg42k";
export const BSKY_URI = `at://${BSKY_DID}/app.bsky.feed.post/${BSKY_RKEY}`;

export const makePost = (overrides: Partial<BlueskyPost> = {}): BlueskyPost => ({
  uri: BSKY_URI,
  cid: "cid",
  text: "A man, a plan, a canal: Panama",
  facetRanges: [],
  tags: ["palindrome"],
  labels: [],
  recordLabels: [],
  author: {
    did: BSKY_DID,
    handle: "a.bsky.social",
    displayName: "A",
    accountLabels: [],
    profileLabels: [],
  },
  createdAt: "2026-09-08T00:00:00.000Z",
  likeCount: 0,
  repostCount: 0,
  replyCount: 0,
  ...overrides,
});
