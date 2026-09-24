import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  RATE_LIMIT_SECONDS,
  BlueskyRequestError,
  failureStatus,
  isRestrictedPost,
  searchQueries,
  unwrapApiResult,
} from "@/lib/bluesky-api";
import type { BlueskyPost, SearchSort } from "@/lib/bluesky-api";
import { blueskyKeys } from "@/queries/query-keys";
import { isTaggedWith, tagQuery, tagsFor } from "@/lib/bluesky-tags";
import type { UiLanguage } from "@/lib/i18n";
import { REMOTE_GC_TIME, REMOTE_STALE_TIME } from "@/queries/query-client";

export type BlueskySearchState = { retry: () => void } & (
  | { status: "loading"; posts: readonly BlueskyPost[] }
  | { status: "ready"; posts: readonly BlueskyPost[] }
  | {
      status: "rateLimited";
      posts: readonly BlueskyPost[];
      cooldownSeconds: number;
      cooldownKey: number;
      retryAt?: number;
    }
  | { status: "badRequest" | "error"; posts: readonly BlueskyPost[] }
);

const SEARCH_FAILURES = { rateLimited: "rateLimited", badRequest: "badRequest" } as const;

export const useBlueskySearch = (lang: UiLanguage, sort: SearchSort): BlueskySearchState => {
  const tags = tagsFor(lang);
  const queryClient = useQueryClient();
  const query = useQuery<readonly BlueskyPost[]>({
    queryKey: blueskyKeys.search(tags, sort),
    queryFn: async ({ signal }) => {
      const posts = unwrapApiResult(await searchQueries(tags.map(tagQuery), sort, fetch, signal));
      for (const post of posts) queryClient.setQueryData(blueskyKeys.post(post.uri), post);
      return posts.filter(
        (post) => !isRestrictedPost(post, "hashtagExplore") && isTaggedWith(post, tags),
      );
    },
    staleTime: REMOTE_STALE_TIME,
    gcTime: REMOTE_GC_TIME,
  });
  const retry = () => {
    void query.refetch();
  };

  if (query.isPending) {
    return { status: "loading", posts: [], retry };
  }
  if (query.isError) {
    const reason = query.error instanceof BlueskyRequestError ? query.error.reason : "error";
    const status = failureStatus(reason, SEARCH_FAILURES, "error");
    if (status === "rateLimited") {
      const retryAt = query.error instanceof BlueskyRequestError ? query.error.retryAt : undefined;
      return {
        status,
        posts: [],
        cooldownSeconds: RATE_LIMIT_SECONDS,
        cooldownKey: retryAt ?? query.errorUpdatedAt,
        retryAt,
        retry,
      };
    }
    return { status, posts: [], retry };
  }
  return { status: "ready", posts: query.data, retry };
};
