import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { useBlueskyPost } from "@/hooks/use-bluesky-post";
import { fetchPost, resolvePostRef } from "@/lib/bluesky-api";
import { BSKY_DID as DID, BSKY_URI as URI, makePost } from "@/test/bluesky-post";

vi.mock("@/lib/bluesky-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bluesky-api")>();
  return { ...actual, fetchPost: vi.fn(), resolvePostRef: vi.fn() };
});

const mockedFetchPost = vi.mocked(fetchPost);
const mockedResolvePostRef = vi.mocked(resolvePostRef);

const post = makePost({ uri: URI, author: { did: DID, handle: "bsky.app" } });

beforeEach(() => {
  vi.clearAllMocks();
  // the at-uri form resolves to itself; handle tests override this
  mockedResolvePostRef.mockResolvedValue({ ok: true, value: URI });
});

describe("useBlueskyPost", () => {
  test("idle without a ref", () => {
    const { result } = renderHook(() => useBlueskyPost(null));
    expect(result.current.status).toBe("idle");
    expect(mockedFetchPost).not.toHaveBeenCalled();
    expect(mockedResolvePostRef).not.toHaveBeenCalled();
  });

  test("fetches an at-uri ref directly", async () => {
    mockedFetchPost.mockResolvedValue({ ok: true, value: post });
    const { result } = renderHook(() => useBlueskyPost({ kind: "uri", uri: URI }));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mockedFetchPost).toHaveBeenCalledWith(URI);
    expect(result.current.post?.text).toBe("A man, a plan, a canal: Panama");
  });

  test("resolves a handle ref first", async () => {
    mockedFetchPost.mockResolvedValue({ ok: true, value: post });
    const { result } = renderHook(() =>
      useBlueskyPost({ kind: "handle", handle: "bsky.app", rkey: "3kq7aeuwbg42k" }),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mockedResolvePostRef).toHaveBeenCalledWith({
      kind: "handle",
      handle: "bsky.app",
      rkey: "3kq7aeuwbg42k",
    });
    expect(mockedFetchPost).toHaveBeenCalledWith(URI);
  });

  test("an unresolvable handle is notFound", async () => {
    mockedResolvePostRef.mockResolvedValue({ ok: false, reason: "notFound" });
    const { result } = renderHook(() =>
      useBlueskyPost({ kind: "handle", handle: "nope", rkey: "3abc" }),
    );

    await waitFor(() => expect(result.current.status).toBe("notFound"));
    expect(mockedFetchPost).not.toHaveBeenCalled();
  });

  test("distinguishes a missing post from a failed request", async () => {
    mockedFetchPost.mockResolvedValueOnce({ ok: false, reason: "notFound" });
    const missing = renderHook(() => useBlueskyPost({ kind: "uri", uri: URI }));
    await waitFor(() => expect(missing.result.current.status).toBe("notFound"));

    mockedFetchPost.mockResolvedValueOnce({ ok: false, reason: "error" });
    const failed = renderHook(() => useBlueskyPost({ kind: "uri", uri: URI }));
    await waitFor(() => expect(failed.result.current.status).toBe("error"));
  });

  test("a handle resolution failure is an error", async () => {
    mockedResolvePostRef.mockResolvedValue({ ok: false, reason: "error" });
    const { result } = renderHook(() =>
      useBlueskyPost({ kind: "handle", handle: "bsky.app", rkey: "3abc" }),
    );

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  test("a rejection is an error and retry runs again", async () => {
    mockedFetchPost
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ ok: true, value: post });
    const { result } = renderHook(() => useBlueskyPost({ kind: "uri", uri: URI }));

    await waitFor(() => expect(result.current.status).toBe("error"));
    result.current.retry();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mockedFetchPost).toHaveBeenCalledTimes(2);
  });
});
