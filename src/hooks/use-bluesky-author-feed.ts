import { useMemo } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import {
  BlueskyRequestError,
  failureStatus,
  fetchAuthorFeed,
  RATE_LIMIT_SECONDS,
  unwrapApiResult,
} from "@/lib/bluesky-api";
import type { BlueskyAuthorFeedPage, BlueskyPost } from "@/lib/bluesky-api";
import { useResolvedActor } from "@/hooks/use-resolved-actor";
import { blueskyKeys } from "@/queries/query-keys";
import { postDigest } from "@/lib/bluesky-post-view";
import type { ThrottleInfo } from "@/lib/throttle";
import { REMOTE_GC_TIME, REMOTE_STALE_TIME } from "@/queries/query-client";

export type AuthorFeedFailure =
  | { reason: "notFound" | "badRequest" | "error" }
  | ({ reason: "rateLimited" } & ThrottleInfo);

export interface BlueskyAuthorFeedState {
  status: "idle" | "loading" | "ready" | "notFound" | "rateLimited" | "error";
  posts: readonly BlueskyPost[];
  hasMore: boolean;
  isLoadingMore: boolean;
  failure: AuthorFeedFailure | null;
  nextPageFailure: AuthorFeedFailure | null;
  allLoadedPostsRestricted: boolean;
  loadMore: () => void;
  retry: () => void;
}

const failureFromError = (error: unknown, errorUpdatedAt: number): AuthorFeedFailure => {
  if (!(error instanceof BlueskyRequestError)) return { reason: "error" };
  if (error.reason === "rateLimited") {
    return {
      reason: "rateLimited",
      retryAt: error.retryAt ?? errorUpdatedAt + RATE_LIMIT_SECONDS * 1000,
      cooldownSeconds: RATE_LIMIT_SECONDS,
    };
  }
  return { reason: error.reason };
};

const AUTHOR_FEED_FAILURES = { notFound: "notFound", rateLimited: "rateLimited" } as const;

const RESTING: Pick<
  BlueskyAuthorFeedState,
  "failure" | "nextPageFailure" | "posts" | "hasMore" | "isLoadingMore" | "allLoadedPostsRestricted"
> = {
  failure: null,
  nextPageFailure: null,
  posts: [],
  hasMore: false,
  isLoadingMore: false,
  allLoadedPostsRestricted: false,
};

export const useBlueskyAuthorFeed = (actor: string | null): BlueskyAuthorFeedState => {
  const queryClient = useQueryClient();
  const { handle, identity, resolvedActor } = useResolvedActor(actor);
  const query = useInfiniteQuery<BlueskyAuthorFeedPage, BlueskyRequestError>({
    queryKey: resolvedActor ? blueskyKeys.authorFeed(resolvedActor) : blueskyKeys.authorFeedIdle,
    enabled: resolvedActor !== null,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      if (!resolvedActor) throw new Error("Author feed query ran without an actor");
      const cursor = typeof pageParam === "string" ? pageParam : null;
      const page = unwrapApiResult(await fetchAuthorFeed(resolvedActor, cursor, fetch, signal));
      for (const post of page.posts) queryClient.setQueryData(blueskyKeys.post(post.uri), post);
      return page;
    },
    getNextPageParam: (lastPage) => (lastPage.cursor === null ? undefined : lastPage.cursor),
    staleTime: REMOTE_STALE_TIME,
    gcTime: REMOTE_GC_TIME,
    refetchOnMount: false,
  });

  const loaded = useMemo(() => {
    const seen = new Set<string>();
    const result: BlueskyPost[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const post of page.posts) {
        if (seen.has(post.uri)) continue;
        seen.add(post.uri);
        result.push(post);
      }
    }
    return result;
  }, [query.data?.pages]);

  const digests = useMemo(
    () => loaded.map((post) => ({ post, digest: postDigest(post, "accountExplore") })),
    [loaded],
  );
  const posts = digests
    .filter(({ digest }) => !digest.restricted && digest.palindrome !== null)
    .map(({ post }) => post);
  const allLoadedPostsRestricted =
    loaded.length > 0 && digests.every(({ digest }) => digest.restricted);
  const nextPageFailure = query.isFetchNextPageError
    ? failureFromError(query.error, query.errorUpdatedAt)
    : null;

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  };
  const retry = () => {
    if (nextPageFailure) void query.fetchNextPage();
    else if (identity.isError) void identity.refetch();
    else void query.refetch();
  };
  const base = {
    posts,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    allLoadedPostsRestricted,
    loadMore,
    retry,
  };

  if (!actor) {
    return { ...base, ...RESTING, status: "idle" };
  }
  if ((handle !== null && identity.isPending) || (resolvedActor !== null && query.isPending)) {
    return { ...base, ...RESTING, status: "loading" };
  }
  if (identity.isError) {
    const failure = failureFromError(identity.error, identity.errorUpdatedAt);
    return {
      ...base,
      ...RESTING,
      status: failureStatus(failure.reason, AUTHOR_FEED_FAILURES, "error"),
      failure,
    };
  }
  if (query.isError && !query.data) {
    const failure = failureFromError(query.error, query.errorUpdatedAt);
    return {
      ...base,
      ...RESTING,
      status: failureStatus(failure.reason, AUTHOR_FEED_FAILURES, "error"),
      failure,
    };
  }
  return { ...base, status: "ready", failure: null, nextPageFailure };
};
