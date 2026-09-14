import {
  RATE_LIMIT_SECONDS,
  failureStatus,
  isRestrictedPost,
  searchQueries,
} from "@/lib/bluesky-api";
import type { BlueskyPost, SearchSort } from "@/lib/bluesky-api";
import { isTaggedWith, tagQuery, tagsFor } from "@/lib/bluesky-tags";
import type { UiLanguage } from "@/lib/i18n";
import { useKeyedResource } from "@/hooks/use-keyed-resource";

// every answer carries the posts list — empty until a load lands — so it is
// stated once rather than in every member
interface SearchPosts {
  posts: readonly BlueskyPost[];
}

export type BlueskySearchState = { retry: () => void } & SearchPosts &
  (
    | { status: "loading" | "ready" | "badRequest" | "error" }
    | { status: "rateLimited"; cooldownSeconds: number }
  );

type SearchOutcome = SearchPosts &
  (
    | { status: "loading" }
    | { status: "ready" }
    | { status: "rateLimited"; cooldownSeconds: number }
    | { status: "badRequest" }
    | { status: "error" }
  );

const SEARCH_FAILURES = { rateLimited: "rateLimited", badRequest: "badRequest" } as const;

// One OR query per (language, sort) for the tags of that language. The
// endpoint refuses cursor paging without auth, so this is a single page of
// `SEARCH_LIMIT`; a throttle and a malformed query each get their own
// status so the UI can tell a back-off from a bug.
export const useBlueskySearch = (lang: UiLanguage, sort: SearchSort): BlueskySearchState => {
  const { state, retry } = useKeyedResource<SearchOutcome>(
    `${lang}|${sort}`,
    async (): Promise<SearchOutcome> => {
      const tags = tagsFor(lang);
      const result = await searchQueries(tags.map(tagQuery), sort);
      if (!result.ok) {
        const status = failureStatus(result.reason, SEARCH_FAILURES, "error");
        return status === "rateLimited"
          ? { status, posts: [], cooldownSeconds: RATE_LIMIT_SECONDS }
          : { status, posts: [] };
      }
      const posts = result.value.filter(
        (post) => !isRestrictedPost(post) && isTaggedWith(post, tags),
      );
      return { status: "ready", posts };
    },
    {
      loading: { status: "loading", posts: [] },
      error: { status: "error", posts: [] },
    },
  );

  return { ...state, retry };
};
