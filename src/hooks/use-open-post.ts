import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";

import { postHash } from "@/lib/bluesky-post";

// Opening a post from the pasted-link form is the same #b= navigation
// wherever that form appears.
export const useOpenPost = (): ((uri: string) => void) => {
  const navigate = useNavigate();
  return useCallback(
    (uri: string) => {
      void navigate({ to: "/p", hash: postHash(uri) });
    },
    [navigate],
  );
};
