import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { useBlueskySearch } from "@/hooks/use-bluesky-search";
import { isRestrictedPost, searchQueries } from "@/lib/bluesky-api";
import { BSKY_DID, makePost } from "@/test/bluesky-post";
import { createTestQueryClient, queryWrapper } from "@/test/query-client";

vi.mock("@/lib/bluesky-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bluesky-api")>();
  return { ...actual, searchQueries: vi.fn(), isRestrictedPost: vi.fn() };
});

const mockedSearch = vi.mocked(searchQueries);
const mockedRestricted = vi.mocked(isRestrictedPost);
let client: ReturnType<typeof createTestQueryClient>;

beforeEach(() => {
  client = createTestQueryClient();
  vi.clearAllMocks();
  mockedRestricted.mockReturnValue(false);
});

describe("useBlueskySearch", () => {
  test("keeps only posts actually tagged, drops restricted ones", async () => {
    const tagged = makePost({ uri: `at://${BSKY_DID}/app.bsky.feed.post/1`, tags: ["palindromo"] });
    const mentioned = makePost({ uri: `at://${BSKY_DID}/app.bsky.feed.post/2`, tags: [] });
    mockedSearch.mockResolvedValue({
      ok: true,
      value: [tagged, mentioned],
    });

    const { result } = renderHook(() => useBlueskySearch("pt", "top"), {
      wrapper: queryWrapper(client),
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.posts).toEqual([tagged]);
    expect(mockedRestricted).toHaveBeenCalledWith(tagged, "hashtagExplore");
    // one query per tag, no OR (Bluesky search has no boolean operator)
    expect(mockedSearch.mock.calls[0]?.slice(0, 2)).toEqual([
      ["#palíndromo", "#palindromo"],
      "top",
    ]);
  });

  test("a throttle and a malformed query get their own status", async () => {
    mockedSearch.mockResolvedValue({ ok: false, reason: "rateLimited" });
    const limited = renderHook(() => useBlueskySearch("en", "latest"), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => expect(limited.result.current.status).toBe("rateLimited"));
    expect(limited.result.current).toMatchObject({ cooldownSeconds: 60 });

    mockedSearch.mockResolvedValue({ ok: false, reason: "badRequest" });
    const bad = renderHook(() => useBlueskySearch("en", "top"), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => expect(bad.result.current.status).toBe("badRequest"));
  });

  test("a network failure is an error", async () => {
    mockedSearch.mockResolvedValue({ ok: false, reason: "error" });
    const { result } = renderHook(() => useBlueskySearch("en", "latest"), {
      wrapper: queryWrapper(client),
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  test("retry re-runs the search", async () => {
    mockedSearch.mockResolvedValue({ ok: false, reason: "rateLimited" });
    const { result } = renderHook(() => useBlueskySearch("en", "top"), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => expect(result.current.status).toBe("rateLimited"));

    result.current.retry();
    await waitFor(() => expect(mockedSearch).toHaveBeenCalledTimes(2));
  });
});
