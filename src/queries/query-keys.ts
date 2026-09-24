import type { SearchSort } from "@/lib/bluesky-api";

export const blueskyKeys = {
  handle: (handle: string) => ["bluesky", "handle", handle.toLowerCase()] as const,
  post: (uri: string) => ["bluesky", "post", uri] as const,
  postIdle: ["bluesky", "post", "idle"] as const,
  search: (tags: readonly string[], sort: SearchSort) =>
    ["bluesky", "search", sort, [...tags]] as const,
  authorFeed: (actor: string) => ["bluesky", "author-feed", actor] as const,
};

export const dictionaryKey = (language: string) => ["dictionary", language] as const;
