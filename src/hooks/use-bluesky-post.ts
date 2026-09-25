import { useQuery, useQueryClient } from "@tanstack/react-query";

import { atUriFor } from "@/lib/bluesky-post";
import type { PostRef } from "@/lib/bluesky-post";
import {
  BlueskyRequestError,
  failureReason,
  failureStatus,
  fetchPost,
  unwrapApiResult,
} from "@/lib/bluesky-api";
import type { BlueskyPost } from "@/lib/bluesky-api";
import { useResolvedActor } from "@/hooks/use-resolved-actor";
import { blueskyKeys } from "@/queries/query-keys";
import { REMOTE_GC_TIME, REMOTE_STALE_TIME } from "@/queries/query-client";

export interface BlueskyPostState {
  status: "idle" | "loading" | "ready" | "notFound" | "badRequest" | "error";
  post: BlueskyPost | null;
  retry: () => void;
}

const POST_FAILURES = { notFound: "notFound", badRequest: "badRequest" } as const;

export const useBlueskyPost = (ref: PostRef | null): BlueskyPostState => {
  const queryClient = useQueryClient();
  const { handle, identity, resolvedActor } = useResolvedActor(
    ref?.kind === "handle" ? ref.handle : null,
  );
  const canonicalUri =
    ref?.kind === "uri"
      ? ref.uri
      : resolvedActor && ref?.kind === "handle"
        ? atUriFor(resolvedActor, ref.rkey)
        : null;
  const query = useQuery<BlueskyPost, BlueskyRequestError>({
    queryKey: canonicalUri ? blueskyKeys.post(canonicalUri) : blueskyKeys.postIdle,
    enabled: canonicalUri !== null,
    queryFn: async ({ signal }) => {
      if (!canonicalUri) throw new Error("Post query ran without a canonical reference");
      const post = unwrapApiResult(await fetchPost(canonicalUri, fetch, signal));
      queryClient.setQueryData(blueskyKeys.post(post.uri), post);
      return post;
    },
    staleTime: REMOTE_STALE_TIME,
    gcTime: REMOTE_GC_TIME,
  });
  const retry = () => {
    if (identity.isError) void identity.refetch();
    else void query.refetch();
  };

  if (!ref) return { status: "idle", post: null, retry };
  const postPending = query.isPending && canonicalUri !== null;
  if ((handle !== null && identity.isPending) || postPending) {
    return { status: "loading", post: null, retry };
  }
  if (identity.isError) {
    return {
      status: failureStatus(failureReason(identity.error), POST_FAILURES, "error"),
      post: null,
      retry,
    };
  }
  if (query.isError) {
    return {
      status: failureStatus(failureReason(query.error), POST_FAILURES, "error"),
      post: null,
      retry,
    };
  }
  return { status: "ready", post: query.data ?? null, retry };
};
