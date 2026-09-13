import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vite-plus/test";

import { useBlueskyEmbed } from "@/hooks/use-bluesky-embed";
import { BSKY_EMBED } from "@/lib/bluesky-post";

const fireMessage = (origin: string, data: unknown) => {
  const event = new MessageEvent("message", { data });
  Object.defineProperty(event, "origin", { value: origin });
  window.dispatchEvent(event);
};

describe("useBlueskyEmbed", () => {
  test("mints an id and a ref_url", () => {
    const { result } = renderHook(() => useBlueskyEmbed());
    expect(result.current.id).toMatch(/^pm-/);
    expect(result.current.refUrl.startsWith("http")).toBe(true);
    expect(result.current.height).toBe(320);
  });

  test("adopts the height only from its own iframe at Bluesky's origin", () => {
    const { result } = renderHook(() => useBlueskyEmbed());
    const { id } = result.current;

    act(() => fireMessage("https://evil.example", { id, height: 999 }));
    expect(result.current.height).toBe(320);

    act(() => fireMessage(BSKY_EMBED, { id: "someone-else", height: 999 }));
    expect(result.current.height).toBe(320);

    act(() => fireMessage(BSKY_EMBED, { id, height: 512 }));
    expect(result.current.height).toBe(512);
  });
});
