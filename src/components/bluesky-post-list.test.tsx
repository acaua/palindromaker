import { cleanup, screen } from "@testing-library/react";
import { createRootRoute, createRoute, Outlet } from "@tanstack/react-router";
import { afterEach, describe, expect, test } from "vite-plus/test";

import BlueskyPostList from "@/components/bluesky-post-list";
import { postHash } from "@/lib/bluesky-post";
import type { BlueskyPost } from "@/lib/bluesky-api";
import { makePost } from "@/test/bluesky-post";
import { renderWithRouter } from "@/test/render-with-router";

afterEach(cleanup);

const renderRouted = async (posts: readonly BlueskyPost[]) => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const exploreRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/explore",
    component: () => <BlueskyPostList posts={posts} />,
  });
  const pRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/p",
    component: () => null,
  });
  renderWithRouter({
    routeTree: rootRoute.addChildren([exploreRoute, pRoute]),
    initialPath: "/explore",
  });
  await screen.findAllByRole("listitem");
};

describe("BlueskyPostList", () => {
  test("renders a row per post and links to the reader", async () => {
    const palindromePost = makePost();
    const plainPost = makePost({
      uri: "at://did:plc:x/app.bsky.feed.post/2",
      text: "spoon",
      author: { did: "did:plc:x", handle: "b.bsky.social", displayName: "B" },
    });
    await renderRouted([palindromePost, plainPost]);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByText("palindrome")).toHaveLength(1);

    const palindromeLink = screen.getByRole("link", { name: /View palindrome/ });
    const postLink = screen.getByRole("link", { name: /View post/ });
    expect(palindromeLink.getAttribute("href")).toBe(`/p#${postHash(palindromePost.uri)}`);
    expect(postLink.getAttribute("href")).toBe(`/p#${postHash(plainPost.uri)}`);
    expect(palindromeLink.getAttribute("aria-label")).toBe("View palindrome — @a.bsky.social");
    expect(postLink.getAttribute("aria-label")).toBe("View post — @b.bsky.social");
    expect(document.querySelectorAll("time").length).toBe(2);
  });
});
