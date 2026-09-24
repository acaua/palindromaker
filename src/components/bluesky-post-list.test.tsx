import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vite-plus/test";

import BlueskyPostList from "@/components/bluesky-post-list";
import { postHash } from "@/lib/bluesky-post";
import { BSKY_DID, makePost } from "@/test/bluesky-post";
import { renderAtExplore } from "@/test/render-with-router";

afterEach(cleanup);

describe("BlueskyPostList", () => {
  test("can render account authors without self-links", async () => {
    renderAtExplore(<BlueskyPostList posts={[makePost()]} linkAuthor={false} />);
    await screen.findAllByRole("listitem");

    expect(screen.getByText("@a.bsky.social")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "@a.bsky.social" })).toBeNull();
  });

  test("renders a row per post and links to the reader", async () => {
    const palindromePost = makePost();
    const plainPost = makePost({
      uri: `at://${BSKY_DID}/app.bsky.feed.post/2`,
      text: "spoon",
      author: {
        did: BSKY_DID,
        handle: "b.bsky.social",
        displayName: "B",
        accountLabels: [],
        profileLabels: [],
      },
    });
    renderAtExplore(<BlueskyPostList posts={[palindromePost, plainPost]} />);
    await screen.findAllByRole("listitem");

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByText("palindrome")).toHaveLength(1);

    const palindromeLink = screen.getByRole("link", { name: /View palindrome/ });
    const postLink = screen.getByRole("link", { name: /View post/ });
    const authorLink = screen.getByRole("link", { name: "@a.bsky.social" });
    expect(palindromeLink.getAttribute("href")).toBe(`/p#${postHash(palindromePost.uri)}`);
    expect(postLink.getAttribute("href")).toBe(`/p#${postHash(plainPost.uri)}`);
    expect(authorLink.getAttribute("href")).toBe(
      `/explore?account=${encodeURIComponent(BSKY_DID)}`,
    );
    expect(palindromeLink.getAttribute("aria-label")).toBe("View palindrome — @a.bsky.social");

    expect(postLink.getAttribute("aria-label")).toBe("View post — @b.bsky.social");
    expect(document.querySelectorAll("time").length).toBe(2);
  });
});
