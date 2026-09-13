import { failureStatus, isRestrictedPost, searchQueries } from "@/lib/bluesky-api";
import type { BlueskyPost, SearchSort } from "@/lib/bluesky-api";
import { isTaggedWith, tagQuery, tagsFor } from "@/lib/bluesky-tags";
import type { UiLanguage } from "@/lib/i18n";
import { useKeyedAsync } from "@/hooks/use-keyed-async";

export interface BlueskySearchState {
  status: "loading" | "ready" | "rateLimited" | "badRequest" | "error";
  posts: readonly BlueskyPost[];
  retry: () => void;
}

type Outcome = {
  status: "ready" | "rateLimited" | "badRequest" | "error";
  posts: readonly BlueskyPost[];
};

const SEARCH_FAILURES = { rateLimited: "rateLimited", badRequest: "badRequest" } as const;

// One OR query per (language, sort) for the tags of that language. The
// endpoint refuses cursor paging without auth, so this is a single page of
// `SEARCH_LIMIT`; a throttle and a malformed query each get their own
// status so the UI can tell a back-off from a bug.
export const useBlueskySearch = (lang: UiLanguage, sort: SearchSort): BlueskySearchState => {
  const { value, retry } = useKeyedAsync<Outcome>(
    `${lang}|${sort}`,
    async () => {
      const tags = tagsFor(lang);
      const result = await searchQueries(tags.map(tagQuery), sort);
      if (!result.ok)
        return { status: failureStatus(result.reason, SEARCH_FAILURES, "error"), posts: [] };
      const posts = result.value.filter(
        (post) => !isRestrictedPost(post) && isTaggedWith(post, tags),
      );
      return { status: "ready", posts };
    },
    () => ({ status: "error", posts: [] }),
  );

  if (!value) return { status: "loading", posts: [], retry };
  return { status: value.status, posts: value.posts, retry };
};
