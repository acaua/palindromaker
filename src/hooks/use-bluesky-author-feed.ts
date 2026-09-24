import { useMemo } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

import {
  BlueskyRequestError,
  fetchAuthorFeed,
  RATE_LIMIT_SECONDS,
  unwrapApiResult,
} from "@/lib/bluesky-api";
import type { BlueskyAuthorFeedPage, BlueskyPost } from "@/lib/bluesky-api";
import { isDidAccount } from "@/lib/bluesky-account";
import { useBlueskyHandle } from "@/hooks/use-bluesky-handle";
import { blueskyKeys } from "@/queries/query-keys";
import { describePost } from "@/lib/bluesky-post-view";
import { REMOTE_GC_TIME, REMOTE_STALE_TIME } from "@/queries/query-client";

export type AuthorFeedFailure =
  | { reason: "notFound" | "badRequest" | "error" }
  | { reason: "rateLimited"; retryAt: number; cooldownSeconds: number };

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

const statusForFailure = (failure: AuthorFeedFailure): "notFound" | "rateLimited" | "error" =>
  failure.reason === "notFound"
    ? "notFound"
    : failure.reason === "rateLimited"
      ? "rateLimited"
      : "error";

export const useBlueskyAuthorFeed = (actor: string | null): BlueskyAuthorFeedState => {
  const queryClient = useQueryClient();
  const handle = actor !== null && !isDidAccount(actor) ? actor : null;
  const identity = useBlueskyHandle(handle);
  const resolvedActor =
    actor !== null && isDidAccount(actor)
      ? actor
      : identity.isError
        ? null
        : (identity.data ?? null);
  const query = useInfiniteQuery<BlueskyAuthorFeedPage, BlueskyRequestError>({
    queryKey: blueskyKeys.authorFeed(resolvedActor ?? "idle"),
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

  const view = useMemo(
    () => loaded.map((post) => ({ post, view: describePost(post, "accountExplore") })),
    [loaded],
  );
  const posts = view
    .filter(({ view: postView }) => !postView.restricted && postView.palindrome !== null)
    .map(({ post }) => post);
  const allLoadedPostsRestricted =
    loaded.length > 0 && view.every(({ view: postView }) => postView.restricted);
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
    return {
      ...base,
      status: "idle",
      failure: null,
      nextPageFailure: null,
      posts: [],
      hasMore: false,
      isLoadingMore: false,
      allLoadedPostsRestricted: false,
    };
  }
  if ((handle !== null && identity.isPending) || (resolvedActor !== null && query.isPending)) {
    return {
      ...base,
      status: "loading",
      failure: null,
      nextPageFailure: null,
      posts: [],
      hasMore: false,
      isLoadingMore: false,
      allLoadedPostsRestricted: false,
    };
  }
  if (identity.isError) {
    const failure = failureFromError(identity.error, identity.errorUpdatedAt);
    return {
      ...base,
      status: statusForFailure(failure),
      failure,
      nextPageFailure: null,
      posts: [],
      hasMore: false,
      isLoadingMore: false,
      allLoadedPostsRestricted: false,
    };
  }
  if (query.isError && !query.data) {
    const failure = failureFromError(query.error, query.errorUpdatedAt);
    return {
      ...base,
      status: statusForFailure(failure),
      failure,
      nextPageFailure: null,
      posts: [],
      hasMore: false,
      isLoadingMore: false,
      allLoadedPostsRestricted: false,
    };
  }
  return {
    ...base,
    status: "ready",
    failure: null,
    nextPageFailure,
  };
};
