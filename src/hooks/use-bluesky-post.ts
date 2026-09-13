import { atUriFor } from "@/lib/bluesky-post";
import type { PostRef } from "@/lib/bluesky-post";
import { failureStatus, fetchPost, resolveHandle } from "@/lib/bluesky-api";
import type { BlueskyPost } from "@/lib/bluesky-api";
import { useKeyedAsync } from "@/hooks/use-keyed-async";

export interface BlueskyPostState {
  status: "idle" | "loading" | "ready" | "notFound" | "badRequest" | "error";
  post: BlueskyPost | null;
  retry: () => void;
}

const postRefKey = (ref: PostRef): string =>
  ref.kind === "uri" ? `uri:${ref.uri}` : `handle:${ref.handle}/${ref.rkey}`;

type Outcome = { status: "ready" | "notFound" | "badRequest" | "error"; post: BlueskyPost | null };

// a failed lookup is "notFound" only when the post truly is not there; a
// malformed request is its own status, and a throttle or network failure
// is an error
const POST_FAILURES = { notFound: "notFound", badRequest: "badRequest" } as const;

// Loads the post a #b= fragment points at. A handle form needs a DID first
// (resolveHandle), an at-uri goes straight to getPosts.
export const useBlueskyPost = (ref: PostRef | null): BlueskyPostState => {
  const { value, retry } = useKeyedAsync<Outcome>(
    ref ? postRefKey(ref) : null,
    async () => {
      if (!ref) return { status: "error", post: null };
      let uri: string;
      if (ref.kind === "uri") {
        uri = ref.uri;
      } else {
        const resolved = await resolveHandle(ref.handle);
        if (!resolved.ok) {
          return { status: failureStatus(resolved.reason, POST_FAILURES, "error"), post: null };
        }
        uri = atUriFor(resolved.value, ref.rkey);
      }
      const result = await fetchPost(uri);
      if (!result.ok) {
        return { status: failureStatus(result.reason, POST_FAILURES, "error"), post: null };
      }
      return { status: "ready", post: result.value };
    },
    () => ({ status: "error", post: null }),
  );

  if (!ref) return { status: "idle", post: null, retry };
  if (!value) return { status: "loading", post: null, retry };
  return { status: value.status, post: value.post, retry };
};
