import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import ExplorePage from "@/components/explore-page";
import { useBlueskyAuthorFeed } from "@/hooks/use-bluesky-author-feed";
import { useBlueskySearch } from "@/hooks/use-bluesky-search";
import { useCountdown } from "@/hooks/use-countdown";
import { makePost } from "@/test/bluesky-post";
import { renderAtExplore } from "@/test/render-with-router";

vi.mock("@/hooks/use-bluesky-search", () => ({ useBlueskySearch: vi.fn() }));
vi.mock("@/hooks/use-bluesky-author-feed", () => ({ useBlueskyAuthorFeed: vi.fn() }));
vi.mock("@/hooks/use-countdown", () => ({ useCountdown: vi.fn() }));

const mockedSearch = vi.mocked(useBlueskySearch);
const mockedFeed = vi.mocked(useBlueskyAuthorFeed);
const mockedCountdown = vi.mocked(useCountdown);

const post = makePost();

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mockedCountdown.mockReturnValue(60);
});

const renderExplorePage = () => renderAtExplore(<ExplorePage />);

describe("ExplorePage", () => {
  test("lists the results", async () => {
    mockedSearch.mockReturnValue({ status: "ready", posts: [post], retry: () => {} });
    renderExplorePage();

    expect(await screen.findByText("Palindromes on Bluesky")).not.toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  test("switching sort re-queries", async () => {
    mockedSearch.mockReturnValue({ status: "ready", posts: [], retry: () => {} });
    renderExplorePage();
    await screen.findByText(/No posts found right now/);

    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(mockedSearch).toHaveBeenLastCalledWith("en", "latest");
  });

  test("a throttle gets its own message and a held retry", async () => {
    const retry = vi.fn();
    mockedSearch.mockReturnValue({
      status: "rateLimited",
      posts: [],
      retry,
      cooldownSeconds: 60,
      cooldownKey: 1,
    });
    renderExplorePage();

    expect(await screen.findByText(/rate-limiting/)).not.toBeNull();
    const button = screen.getByRole("button", { name: /Try again in \d+s/ });
    expect(button.getAttribute("disabled")).toBe("");
  });

  test("the held retry releases at zero and fires", async () => {
    const retry = vi.fn();
    mockedSearch.mockReturnValue({
      status: "rateLimited",
      posts: [],
      retry,
      cooldownSeconds: 60,
      cooldownKey: 1,
    });
    mockedCountdown.mockReturnValue(0);
    renderExplorePage();

    expect(await screen.findByText(/rate-limiting/)).not.toBeNull();
    const button = screen.getByRole("button", { name: "Try again" });
    expect(button.getAttribute("disabled")).toBeNull();
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  test("other failures can be retried", async () => {
    const retry = vi.fn();
    mockedSearch.mockReturnValue({ status: "error", posts: [], retry });
    renderExplorePage();

    const button = await screen.findByRole("button", { name: "Try again" });
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  test("a malformed search reads differently from a network failure", async () => {
    mockedSearch.mockReturnValue({ status: "badRequest", posts: [], retry: () => {} });
    renderExplorePage();
    expect(await screen.findByText(/couldn’t process this search/i)).not.toBeNull();
  });

  test("account mode skips hashtag search and shows the account feed", async () => {
    mockedFeed.mockReturnValue({
      status: "ready",
      posts: [post],
      hasMore: false,
      isLoadingMore: false,
      failure: null,
      nextPageFailure: null,
      allLoadedPostsRestricted: false,
      loadMore: () => {},
      retry: () => {},
    });
    renderAtExplore(<ExplorePage />, "/explore?account=alice.bsky.social");

    expect(
      await screen.findByRole("heading", { name: /Palindromes by @alice\.bsky\.social/ }),
    ).not.toBeNull();
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  test("same-route account navigation resets the view", async () => {
    mockedSearch.mockReturnValue({ status: "ready", posts: [], retry: () => {} });
    mockedFeed.mockReturnValue({
      status: "ready",
      posts: [],
      hasMore: false,
      isLoadingMore: false,
      failure: null,
      nextPageFailure: null,
      allLoadedPostsRestricted: false,
      loadMore: () => {},
      retry: () => {},
    });
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    renderExplorePage();

    const input = await screen.findByPlaceholderText("alice.bsky.social or bsky.app/profile/…");

    fireEvent.change(input, { target: { value: "alice.bsky.social" } });
    fireEvent.submit(input.closest("form")!);
    expect(
      await screen.findByRole("heading", { name: /Palindromes by @alice\.bsky\.social/ }),
    ).not.toBeNull();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);

    fireEvent.click(screen.getByRole("link", { name: "Back to Explore" }));
    expect(await screen.findByText("Palindromes on Bluesky")).not.toBeNull();
    scrollTo.mockRestore();
  });

  test("an empty account query shows the account validation state", async () => {
    mockedFeed.mockReturnValue({
      status: "ready",
      posts: [],
      hasMore: false,
      isLoadingMore: false,
      failure: null,
      nextPageFailure: null,
      allLoadedPostsRestricted: false,
      loadMore: () => {},
      retry: () => {},
    });
    renderAtExplore(<ExplorePage />, "/explore?account=");

    expect((await screen.findByRole("alert")).textContent).toBe("That account doesn't look valid.");
    expect(mockedSearch).not.toHaveBeenCalled();
  });
});
