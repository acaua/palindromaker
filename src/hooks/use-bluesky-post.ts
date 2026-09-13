import type { PostRef } from "@/lib/bluesky-post";
import { failureStatus, fetchPost, resolvePostRef } from "@/lib/bluesky-api";
import type { BlueskyPost } from "@/lib/bluesky-api";
import { useKeyedResource } from "@/hooks/use-keyed-resource";

export interface BlueskyPostState {
  status: "idle" | "loading" | "ready" | "notFound" | "badRequest" | "error";
  post: BlueskyPost | null;
  retry: () => void;
}

const postRefKey = (ref: PostRef): string =>
  ref.kind === "uri" ? `uri:${ref.uri}` : `handle:${ref.handle}/${ref.rkey}`;

type PostOutcome =
  | { status: "idle"; post: null }
  | { status: "loading"; post: null }
  | { status: "ready"; post: BlueskyPost }
  | { status: "notFound"; post: null }
  | { status: "badRequest"; post: null }
  | { status: "error"; post: null };

// a failed lookup is "notFound" only when the post truly is not there; a
// malformed request is its own status, and a throttle or network failure
// is an error
const POST_FAILURES = { notFound: "notFound", badRequest: "badRequest" } as const;

// Loads the post a #b= fragment points at. A handle form needs a DID first
// (resolvePostRef), an at-uri goes straight to getPosts.
export const useBlueskyPost = (ref: PostRef | null): BlueskyPostState => {
  const { state, retry } = useKeyedResource<PostOutcome>(
    ref ? postRefKey(ref) : null,
    async (): Promise<PostOutcome> => {
      if (!ref) return { status: "error", post: null };
      const uri = await resolvePostRef(ref);
      if (!uri.ok) {
        return { status: failureStatus(uri.reason, POST_FAILURES, "error"), post: null };
      }
      const result = await fetchPost(uri.value);
      if (!result.ok) {
        return { status: failureStatus(result.reason, POST_FAILURES, "error"), post: null };
      }
      return { status: "ready", post: result.value };
    },
    {
      idle: { status: "idle", post: null },
      loading: { status: "loading", post: null },
      error: { status: "error", post: null },
    },
  );

  return { ...state, retry };
};
