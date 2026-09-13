import { useEffect, useState } from "react";

import { BSKY_EMBED } from "@/lib/bluesky-post";

// The state behind the embed iframe: a stable id for the handshake, the
// page URL the post links back to, and the height the iframe reports. The
// id travels in the iframe's query string; the iframe posts {id, height}
// back from embed.bsky.app.
export const useBlueskyEmbed = () => {
  const [id] = useState(() => `pm-${Math.random().toString(36).slice(2)}`);
  const [refUrl] = useState(() =>
    typeof location === "undefined" ? "" : `${location.origin}${location.pathname}`,
  );
  const [height, setHeight] = useState(320);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== BSKY_EMBED) return;
      const data = event.data as { id?: unknown; height?: unknown } | null;
      if (!data || data.id !== id || typeof data.height !== "number") return;
      setHeight(data.height);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [id]);

  return { id, refUrl, height };
};
