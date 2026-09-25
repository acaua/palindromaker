import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import AccountExplore from "@/components/account-explore";
import { useBlueskyAuthorFeed } from "@/hooks/use-bluesky-author-feed";
import { makePost, BSKY_DID } from "@/test/bluesky-post";
import { renderAtExplore } from "@/test/render-with-router";

vi.mock("@/hooks/use-bluesky-author-feed", () => ({ useBlueskyAuthorFeed: vi.fn() }));

const mockedFeed = vi.mocked(useBlueskyAuthorFeed);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("AccountExplore", () => {
  test("shows the extracted palindrome and source preview", async () => {
    mockedFeed.mockReturnValue({
      status: "ready",
      posts: [makePost({ text: "A man, a plan, a canal: Panama" })],
      hasMore: false,
      isLoadingMore: false,
      failure: null,
      nextPageFailure: null,
      allLoadedPostsRestricted: false,
      loadMore: vi.fn(),
      retry: vi.fn(),
    });
    renderAtExplore(<AccountExplore input="Alice.bsky.social" />);

    expect(
      await screen.findByRole("heading", { name: /Palindromes by @alice\.bsky\.social/ }),
    ).not.toBeNull();
    expect(await screen.findAllByText("A man, a plan, a canal: Panama")).toHaveLength(2);
    expect(await screen.findByText(/Original post/)).not.toBeNull();
  });

  test("loads older posts only from the explicit button", async () => {
    const loadMore = vi.fn();
    mockedFeed.mockReturnValue({
      status: "ready",
      posts: [makePost()],
      hasMore: true,
      isLoadingMore: false,
      failure: null,
      nextPageFailure: null,
      allLoadedPostsRestricted: false,
      loadMore,
      retry: vi.fn(),
    });
    renderAtExplore(<AccountExplore input="alice.bsky.social" />);

    fireEvent.click(await screen.findByRole("button", { name: "Load older posts" }));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  test("shows a DID without an at-sign", async () => {
    mockedFeed.mockReturnValue({
      status: "ready",
      posts: [],
      hasMore: false,
      isLoadingMore: false,
      failure: null,
      nextPageFailure: null,
      allLoadedPostsRestricted: false,
      loadMore: vi.fn(),
      retry: vi.fn(),
    });
    renderAtExplore(<AccountExplore input={BSKY_DID} />);

    expect(await screen.findByRole("heading", { name: new RegExp(BSKY_DID) })).not.toBeNull();
  });

  test("shows a neutral state when all loaded posts are restricted", async () => {
    mockedFeed.mockReturnValue({
      status: "ready",
      posts: [],
      hasMore: false,
      isLoadingMore: false,
      failure: null,
      nextPageFailure: null,
      allLoadedPostsRestricted: true,
      loadMore: vi.fn(),
      retry: vi.fn(),
    });
    renderAtExplore(<AccountExplore input="alice.bsky.social" />);

    expect((await screen.findByRole("status")).textContent).toContain("restricted");
  });

  test("shows an inline invalid-account state", async () => {
    renderAtExplore(<AccountExplore input="not an account" />);
    expect((await screen.findByRole("alert")).textContent).toContain("account");
    expect(mockedFeed).not.toHaveBeenCalled();
  });
});
