import { StrictMode } from "react";
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { useBlueskyAuthorFeed } from "@/hooks/use-bluesky-author-feed";
import { fetchAuthorFeed, resolveHandle } from "@/lib/bluesky-api";
import { BSKY_DID, makePost } from "@/test/bluesky-post";
import { createTestQueryClient, queryWrapper } from "@/test/query-client";
import { blueskyKeys } from "@/queries/query-keys";

vi.mock("@/lib/bluesky-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bluesky-api")>()),
  fetchAuthorFeed: vi.fn(),
  resolveHandle: vi.fn(),
}));

const mockedFetchAuthorFeed = vi.mocked(fetchAuthorFeed);
const mockedResolveHandle = vi.mocked(resolveHandle);
let client: ReturnType<typeof createTestQueryClient>;

const strictQueryWrapper = (client: ReturnType<typeof createTestQueryClient>) => {
  const Wrapper = queryWrapper(client);
  return ({ children }: { children: ReactNode }) => (
    <StrictMode>
      <Wrapper>{children}</Wrapper>
    </StrictMode>
  );
};

beforeEach(() => {
  client = createTestQueryClient();
  vi.clearAllMocks();
  mockedResolveHandle.mockResolvedValue({ ok: true, value: BSKY_DID });
});

describe("useBlueskyAuthorFeed", () => {
  test("filters to unrestricted palindrome posts and exposes the cursor", async () => {
    const hit = makePost({
      uri: "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/1",
      text: "A man, a plan, a canal: Panama",
    });
    const plain = makePost({
      uri: "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/2",
      text: "spoon",
    });
    const restricted = makePost({
      uri: "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/3",
      text: "A man, a plan, a canal: Panama",
      labels: ["porn"],
    });
    mockedFetchAuthorFeed.mockResolvedValue({
      ok: true,
      value: { posts: [hit, plain, restricted], cursor: "next" },
    });

    const { result } = renderHook(() => useBlueskyAuthorFeed(BSKY_DID), {
      wrapper: queryWrapper(client),
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.posts).toEqual([hit]);
    expect(result.current.hasMore).toBe(true);
    expect(mockedFetchAuthorFeed.mock.calls[0]?.[0]).toBe(BSKY_DID);
    expect(mockedFetchAuthorFeed.mock.calls[0]?.[1]).toBeNull();
  });

  test("resolves a handle before requesting its feed", async () => {
    const hit = makePost();
    mockedFetchAuthorFeed.mockResolvedValue({ ok: true, value: { posts: [hit], cursor: null } });

    const { result } = renderHook(() => useBlueskyAuthorFeed("alice.bsky.social"), {
      wrapper: queryWrapper(client),
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mockedResolveHandle).toHaveBeenCalledWith(
      "alice.bsky.social",
      expect.anything(),
      expect.anything(),
    );
    expect(mockedFetchAuthorFeed.mock.calls[0]?.[0]).toBe(BSKY_DID);
  });

  test("a failed identity revalidation hides the old feed", async () => {
    const hit = makePost();
    mockedFetchAuthorFeed.mockResolvedValue({ ok: true, value: { posts: [hit], cursor: null } });
    const { result } = renderHook(() => useBlueskyAuthorFeed("alice.bsky.social"), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    mockedResolveHandle.mockResolvedValueOnce({ ok: false, reason: "error" });
    await act(async () => {
      await client.invalidateQueries({ queryKey: blueskyKeys.handle("alice.bsky.social") });
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.posts).toEqual([]);
    expect(mockedFetchAuthorFeed).toHaveBeenCalledTimes(1);
  });

  test("does not refetch cached cursor pages on remount", async () => {
    const hit = makePost({ text: "Level" });
    mockedFetchAuthorFeed.mockResolvedValue({
      ok: true,
      value: { posts: [hit], cursor: "next" },
    });
    const first = renderHook(() => useBlueskyAuthorFeed(BSKY_DID), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => expect(first.result.current.status).toBe("ready"));
    first.unmount();
    await client.invalidateQueries({
      queryKey: blueskyKeys.authorFeed(BSKY_DID),
      refetchType: "none",
    });

    const second = renderHook(() => useBlueskyAuthorFeed(BSKY_DID), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => expect(second.result.current.status).toBe("ready"));
    expect(mockedFetchAuthorFeed).toHaveBeenCalledTimes(1);
  });

  test("does not duplicate the initial request in StrictMode", async () => {
    const hit = makePost({
      uri: "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/1",
      text: "Level",
    });
    mockedFetchAuthorFeed.mockResolvedValue({ ok: true, value: { posts: [hit], cursor: null } });

    const { result } = renderHook(() => useBlueskyAuthorFeed(BSKY_DID), {
      wrapper: strictQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(mockedFetchAuthorFeed).toHaveBeenCalledTimes(1);
  });

  test("filters account access restrictions in account mode", async () => {
    const hit = makePost({
      author: { ...makePost().author, accountLabels: ["!no-unauthenticated"] },
    });
    mockedFetchAuthorFeed.mockResolvedValue({ ok: true, value: { posts: [hit], cursor: null } });

    const { result } = renderHook(() => useBlueskyAuthorFeed(BSKY_DID), {
      wrapper: queryWrapper(client),
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.posts).toEqual([]);
    expect(result.current.allLoadedPostsRestricted).toBe(true);
  });

  test("does not suppress an account for an adult account label", async () => {
    const hit = makePost({
      author: { ...makePost().author, accountLabels: ["porn"] },
    });
    mockedFetchAuthorFeed.mockResolvedValue({ ok: true, value: { posts: [hit], cursor: null } });

    const { result } = renderHook(() => useBlueskyAuthorFeed(BSKY_DID), {
      wrapper: queryWrapper(client),
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.posts).toEqual([hit]);
    expect(result.current.allLoadedPostsRestricted).toBe(false);
  });

  test("marks a page as restricted when every loaded post is restricted", async () => {
    const restricted = makePost({ labels: ["porn"] });
    mockedFetchAuthorFeed.mockResolvedValue({
      ok: true,
      value: { posts: [restricted], cursor: null },
    });

    const { result } = renderHook(() => useBlueskyAuthorFeed(BSKY_DID), {
      wrapper: queryWrapper(client),
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.posts).toEqual([]);
    expect(result.current.allLoadedPostsRestricted).toBe(true);
  });

  test("appends older pages and deduplicates by URI", async () => {
    const first = makePost({ uri: "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/1" });
    const older = makePost({ uri: "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/2" });
    mockedFetchAuthorFeed
      .mockResolvedValueOnce({ ok: true, value: { posts: [first], cursor: "next" } })
      .mockResolvedValueOnce({ ok: true, value: { posts: [first, older], cursor: null } });

    const { result } = renderHook(() => useBlueskyAuthorFeed(BSKY_DID), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.posts).toEqual([first, older]));
    expect(result.current.hasMore).toBe(false);
    expect(mockedFetchAuthorFeed.mock.calls[1]?.[1]).toBe("next");
  });

  test("preserves a typed throttle for an older page", async () => {
    const first = makePost();
    mockedFetchAuthorFeed
      .mockResolvedValueOnce({ ok: true, value: { posts: [first], cursor: "next" } })
      .mockResolvedValueOnce({ ok: false, reason: "rateLimited", retryAt: 123 });

    const { result } = renderHook(() => useBlueskyAuthorFeed(BSKY_DID), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => result.current.loadMore());
    await waitFor(() =>
      expect(result.current.nextPageFailure).toEqual(
        expect.objectContaining({ reason: "rateLimited", retryAt: 123 }),
      ),
    );
    expect(result.current.nextPageFailure?.reason).toBe("rateLimited");
    if (result.current.nextPageFailure?.reason === "rateLimited") {
      expect(result.current.nextPageFailure.cooldownSeconds).toBeGreaterThanOrEqual(0);
    }
    expect(result.current.posts).toEqual([first]);
  });

  test("keeps existing posts when an older page fails and retries that page", async () => {
    const first = makePost({ uri: "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/1" });
    const older = makePost({ uri: "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/2" });
    mockedFetchAuthorFeed
      .mockResolvedValueOnce({ ok: true, value: { posts: [first], cursor: "next" } })
      .mockResolvedValueOnce({ ok: false, reason: "error" })
      .mockResolvedValueOnce({ ok: true, value: { posts: [older], cursor: null } });

    const { result } = renderHook(() => useBlueskyAuthorFeed(BSKY_DID), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.nextPageFailure).toEqual({ reason: "error" }));

    expect(result.current.posts).toEqual([first]);

    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.posts).toEqual([first, older]));
    expect(result.current.nextPageFailure).toBeNull();
  });

  test("continues paging on an empty-string opaque cursor", async () => {
    const first = makePost({ uri: "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/1" });
    const older = makePost({ uri: "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.post/2" });
    mockedFetchAuthorFeed
      .mockResolvedValueOnce({ ok: true, value: { posts: [first], cursor: "" } })
      .mockResolvedValueOnce({ ok: true, value: { posts: [older], cursor: null } });

    const { result } = renderHook(() => useBlueskyAuthorFeed(BSKY_DID), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.hasMore).toBe(true);

    await act(async () => result.current.loadMore());
    await waitFor(() => expect(result.current.posts).toEqual([first, older]));
    expect(mockedFetchAuthorFeed.mock.calls[1]?.[1]).toBe("");
    expect(result.current.hasMore).toBe(false);
  });
});
