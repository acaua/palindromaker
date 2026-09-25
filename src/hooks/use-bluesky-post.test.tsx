import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { useBlueskyPost } from "@/hooks/use-bluesky-post";
import { fetchPost, resolveHandle } from "@/lib/bluesky-api";
import { BSKY_DID as DID, BSKY_URI as URI, makePost } from "@/test/bluesky-post";
import { createTestQueryClient, queryWrapper } from "@/test/query-client";
import { blueskyKeys } from "@/queries/query-keys";

vi.mock("@/lib/bluesky-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bluesky-api")>();
  return { ...actual, fetchPost: vi.fn(), resolveHandle: vi.fn() };
});

const mockedFetchPost = vi.mocked(fetchPost);
const mockedResolveHandle = vi.mocked(resolveHandle);

const post = makePost({
  uri: URI,
  author: { did: DID, handle: "bsky.app", accountLabels: [], profileLabels: [] },
});
let client: ReturnType<typeof createTestQueryClient>;

beforeEach(() => {
  client = createTestQueryClient();
  vi.clearAllMocks();
  // the at-uri form resolves to itself; handle tests override this
  mockedResolveHandle.mockResolvedValue({ ok: true, value: DID });
});

describe("useBlueskyPost", () => {
  test("idle without a ref", () => {
    const { result } = renderHook(() => useBlueskyPost(null), {
      wrapper: queryWrapper(client),
    });
    expect(result.current.status).toBe("idle");
    expect(mockedFetchPost).not.toHaveBeenCalled();
    expect(mockedResolveHandle).not.toHaveBeenCalled();
  });

  test("fetches an at-uri ref directly", async () => {
    mockedFetchPost.mockResolvedValue({ ok: true, value: post });
    const { result } = renderHook(() => useBlueskyPost({ kind: "uri", uri: URI }), {
      wrapper: queryWrapper(client),
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mockedFetchPost.mock.calls[0]?.[0]).toBe(URI);
    expect(result.current.post?.text).toBe("A man, a plan, a canal: Panama");
  });

  test("resolves a handle ref first", async () => {
    mockedFetchPost.mockResolvedValue({ ok: true, value: post });
    const { result } = renderHook(
      () => useBlueskyPost({ kind: "handle", handle: "bsky.app", rkey: "3kq7aeuwbg42k" }),
      { wrapper: queryWrapper(client) },
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mockedResolveHandle.mock.calls[0]?.[0]).toBe("bsky.app");
    expect(mockedFetchPost.mock.calls[0]?.[0]).toBe(URI);
  });

  test("an unresolvable handle is notFound", async () => {
    mockedResolveHandle.mockResolvedValue({ ok: false, reason: "notFound" });
    const { result } = renderHook(
      () => useBlueskyPost({ kind: "handle", handle: "nope", rkey: "3abc" }),
      { wrapper: queryWrapper(client) },
    );

    await waitFor(() => expect(result.current.status).toBe("notFound"));
    expect(mockedFetchPost).not.toHaveBeenCalled();
  });

  test("distinguishes a missing post from a failed request", async () => {
    mockedFetchPost.mockResolvedValueOnce({ ok: false, reason: "notFound" });
    const missing = renderHook(() => useBlueskyPost({ kind: "uri", uri: URI }), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => expect(missing.result.current.status).toBe("notFound"));

    mockedFetchPost.mockResolvedValueOnce({ ok: false, reason: "error" });
    const failed = renderHook(() => useBlueskyPost({ kind: "uri", uri: URI }), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => expect(failed.result.current.status).toBe("error"));
  });

  test("a handle resolution failure is an error", async () => {
    mockedResolveHandle.mockResolvedValue({ ok: false, reason: "error" });
    const { result } = renderHook(
      () => useBlueskyPost({ kind: "handle", handle: "bsky.app", rkey: "3abc" }),
      { wrapper: queryWrapper(client) },
    );

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  test("a failed identity revalidation hides the old DID", async () => {
    mockedFetchPost.mockResolvedValue({ ok: true, value: post });
    const { result } = renderHook(
      () => useBlueskyPost({ kind: "handle", handle: "bsky.app", rkey: "3abc" }),
      { wrapper: queryWrapper(client) },
    );
    await waitFor(() => expect(result.current.status).toBe("ready"));

    mockedResolveHandle.mockResolvedValueOnce({ ok: false, reason: "error" });
    await act(async () => {
      await client.invalidateQueries({ queryKey: blueskyKeys.handle("bsky.app") });
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.post).toBeNull();
    expect(mockedFetchPost).toHaveBeenCalledTimes(1);
  });

  test("a rejection is an error and retry runs again", async () => {
    mockedFetchPost
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ ok: true, value: post });
    const { result } = renderHook(() => useBlueskyPost({ kind: "uri", uri: URI }), {
      wrapper: queryWrapper(client),
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    result.current.retry();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mockedFetchPost).toHaveBeenCalledTimes(2);
  });
});
