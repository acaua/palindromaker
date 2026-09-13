import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";

import { postHash } from "@/lib/bluesky-post";

// Opening a post in the reader is the same #b= navigation wherever a
// gallery card or a pasted link starts it.
export const useOpenPost = (): ((uri: string) => void) => {
  const navigate = useNavigate();
  return useCallback(
    (uri: string) => {
      void navigate({ to: "/p", hash: postHash(uri) });
    },
    [navigate],
  );
};
