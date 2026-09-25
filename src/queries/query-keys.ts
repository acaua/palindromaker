import type { SearchSort } from "@/lib/bluesky-api";

export const blueskyKeys = {
  handle: (handle: string) => ["bluesky", "handle", handle.toLowerCase()] as const,
  handleIdle: ["bluesky", "handle", "idle"] as const,
  post: (uri: string) => ["bluesky", "post", uri] as const,
  postIdle: ["bluesky", "post", "idle"] as const,
  search: (tags: readonly string[], sort: SearchSort) =>
    ["bluesky", "search", sort, [...tags]] as const,
  authorFeed: (actor: string) => ["bluesky", "author-feed", actor] as const,
  authorFeedIdle: ["bluesky", "author-feed", "idle"] as const,
};

export const dictionaryKey = (language: string) => ["dictionary", language] as const;
