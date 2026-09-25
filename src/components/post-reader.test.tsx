import { cleanup, screen } from "@testing-library/react";
import { createRootRoute, createRoute, Outlet } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import PostReader from "@/components/post-reader";
import { useBlueskyPost } from "@/hooks/use-bluesky-post";
import type { PostRef } from "@/lib/bluesky-post";
import { BSKY_DID, makePost } from "@/test/bluesky-post";
import { renderWithRouter } from "@/test/render-with-router";

vi.mock("@/hooks/use-bluesky-post", () => ({ useBlueskyPost: vi.fn() }));
// the real embed mounts an iframe, which happy-dom would try to load
vi.mock("@/components/bluesky-embed", () => ({ default: () => <div data-testid="embed" /> }));

const mockedUseBlueskyPost = vi.mocked(useBlueskyPost);

const ref: PostRef = { kind: "uri", uri: `at://${BSKY_DID}/app.bsky.feed.post/1` };

const retry = () => {};

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
});

// Reader renders a TanStack Link, so the unit needs a router context
async function renderRouted(ui: ReactElement) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const pRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/p",
    component: () => ui,
  });
  const view = renderWithRouter({
    routeTree: rootRoute.addChildren([pRoute]),
    initialEntry: "/p",
  });
  await Promise.resolve();
  return view;
}

describe("PostReader", () => {
  test("shows the embed and the extracted palindrome", async () => {
    mockedUseBlueskyPost.mockReturnValue({ status: "ready", post: makePost(), retry });
    const { container } = await renderRouted(<PostReader input={ref} />);

    expect(await screen.findByText("Copy text")).not.toBeNull();
    expect(screen.getByTestId("embed")).not.toBeNull();
    expect(container.querySelector('[role="region"]')?.textContent).toContain(
      "A man, a plan, a canal: Panama",
    );
    // the reader footer carries all three share actions
    expect(screen.getByRole("link", { name: "Edit this" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Copy link" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "View on Bluesky" })).not.toBeNull();
  });

  test("keeps the embed but says so when there is no palindrome", async () => {
    mockedUseBlueskyPost.mockReturnValue({
      status: "ready",
      post: makePost({ text: "spoon" }),
      retry,
    });
    const { container } = await renderRouted(<PostReader input={ref} />);

    expect(await screen.findByText("No palindrome found in this post.")).not.toBeNull();
    expect(screen.getByTestId("embed")).not.toBeNull();
    expect(container.querySelector('[role="region"]')).toBeNull();
  });

  test("a restricted post is not extracted", async () => {
    mockedUseBlueskyPost.mockReturnValue({
      status: "ready",
      post: makePost({ labels: ["porn"] }),
      retry,
    });
    await renderRouted(<PostReader input={ref} />);

    expect(await screen.findByText(/logged-out viewers/)).not.toBeNull();
    expect(screen.queryByText("Copy text")).toBeNull();
  });

  test("loading, notFound and error each read their own message", async () => {
    mockedUseBlueskyPost.mockReturnValue({ status: "loading", post: null, retry });
    await renderRouted(<PostReader input={ref} />);
    expect(await screen.findByText("Loading the post…")).not.toBeNull();
    cleanup();

    mockedUseBlueskyPost.mockReturnValue({ status: "notFound", post: null, retry });
    await renderRouted(<PostReader input={ref} />);
    expect(await screen.findByText("That post isn’t available.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Try again" })).not.toBeNull();
    cleanup();

    mockedUseBlueskyPost.mockReturnValue({ status: "error", post: null, retry });
    await renderRouted(<PostReader input={ref} />);
    expect(await screen.findByText("Couldn’t load the post.")).not.toBeNull();
    cleanup();

    mockedUseBlueskyPost.mockReturnValue({ status: "badRequest", post: null, retry });
    await renderRouted(<PostReader input={ref} />);
    expect(await screen.findByText("Bluesky couldn’t load this post.")).not.toBeNull();
  });
});
