import { useQuery } from "@tanstack/react-query";

import { BlueskyRequestError, resolveHandle, unwrapApiResult } from "@/lib/bluesky-api";
import { blueskyKeys } from "@/queries/query-keys";
import { REMOTE_GC_TIME, REMOTE_STALE_TIME } from "@/queries/query-client";

export const useBlueskyHandle = (handle: string | null) =>
  useQuery<string, BlueskyRequestError>({
    queryKey: handle === null ? blueskyKeys.handleIdle : blueskyKeys.handle(handle),
    enabled: handle !== null,
    queryFn: async ({ signal }) => {
      if (!handle) throw new Error("Handle query ran without a handle");
      return unwrapApiResult(await resolveHandle(handle, fetch, signal));
    },
    staleTime: REMOTE_STALE_TIME,
    gcTime: REMOTE_GC_TIME,
  });
