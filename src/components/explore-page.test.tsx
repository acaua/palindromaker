import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import ExplorePage from "@/components/explore-page";
import { useBlueskySearch } from "@/hooks/use-bluesky-search";
import { useCountdown } from "@/hooks/use-countdown";
import { makePost } from "@/test/bluesky-post";

vi.mock("@/hooks/use-bluesky-search", () => ({ useBlueskySearch: vi.fn() }));
vi.mock("@/hooks/use-countdown", () => ({ useCountdown: vi.fn() }));

const mockedSearch = vi.mocked(useBlueskySearch);
const mockedCountdown = vi.mocked(useCountdown);

const post = makePost();

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mockedCountdown.mockReturnValue(60);
});

async function renderRouted(ui: ReactElement) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const exploreRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/explore",
    component: () => ui,
  });
  const pRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/p",
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([exploreRoute, pRoute]),
    history: createMemoryHistory({ initialEntries: ["/explore"] }),
  });
  const view = render(<RouterProvider router={router} />);
  await Promise.resolve();
  return view;
}

describe("ExplorePage", () => {
  test("lists the results", async () => {
    mockedSearch.mockReturnValue({ status: "ready", posts: [post], retry: () => {} });
    await renderRouted(<ExplorePage />);

    expect(await screen.findByText("Palindromes on Bluesky")).not.toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  test("switching sort re-queries", async () => {
    mockedSearch.mockReturnValue({ status: "ready", posts: [], retry: () => {} });
    await renderRouted(<ExplorePage />);
    await screen.findByText(/No posts found right now/);

    fireEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(mockedSearch).toHaveBeenLastCalledWith("en", "latest");
  });

  test("a throttle gets its own message and a held retry", async () => {
    const retry = vi.fn();
    mockedSearch.mockReturnValue({ status: "rateLimited", posts: [], retry, cooldownSeconds: 60 });
    await renderRouted(<ExplorePage />);

    expect(await screen.findByText(/rate-limiting/)).not.toBeNull();
    const button = screen.getByRole("button", { name: /Try again in \d+s/ });
    expect(button.getAttribute("disabled")).toBe("");
  });

  test("the held retry releases at zero and fires", async () => {
    const retry = vi.fn();
    mockedSearch.mockReturnValue({ status: "rateLimited", posts: [], retry, cooldownSeconds: 60 });
    mockedCountdown.mockReturnValue(0);
    await renderRouted(<ExplorePage />);

    expect(await screen.findByText(/rate-limiting/)).not.toBeNull();
    const button = screen.getByRole("button", { name: "Try again" });
    expect(button.getAttribute("disabled")).toBeNull();
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  test("other failures can be retried", async () => {
    const retry = vi.fn();
    mockedSearch.mockReturnValue({ status: "error", posts: [], retry });
    await renderRouted(<ExplorePage />);

    const button = await screen.findByRole("button", { name: "Try again" });
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  test("a malformed search reads differently from a network failure", async () => {
    mockedSearch.mockReturnValue({ status: "badRequest", posts: [], retry: () => {} });
    await renderRouted(<ExplorePage />);

    expect(await screen.findByText(/couldn’t process this search/i)).not.toBeNull();
  });
});
