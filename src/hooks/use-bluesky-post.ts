import { useQuery, useQueryClient } from "@tanstack/react-query";

import { atUriFor } from "@/lib/bluesky-post";
import type { PostRef } from "@/lib/bluesky-post";
import { BlueskyRequestError, failureStatus, fetchPost, unwrapApiResult } from "@/lib/bluesky-api";
import type { BlueskyPost } from "@/lib/bluesky-api";
import { useBlueskyHandle } from "@/hooks/use-bluesky-handle";
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
  const handle = ref?.kind === "handle" ? ref.handle : null;
  const identity = useBlueskyHandle(handle);
  const canonicalUri =
    ref?.kind === "uri"
      ? ref.uri
      : ref?.kind === "handle" && !identity.isError && identity.data
        ? atUriFor(identity.data, ref.rkey)
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
    const reason = identity.error instanceof BlueskyRequestError ? identity.error.reason : "error";
    return {
      status: failureStatus(reason, POST_FAILURES, "error"),
      post: null,
      retry,
    };
  }
  if (query.isError) {
    const reason = query.error instanceof BlueskyRequestError ? query.error.reason : "error";
    return {
      status: failureStatus(reason, POST_FAILURES, "error"),
      post: null,
      retry,
    };
  }
  return { status: "ready", post: query.data ?? null, retry };
};
