import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vite-plus/test";

import BlueskyPostList from "@/components/bluesky-post-list";
import { postHash } from "@/lib/bluesky-post";
import { makePost } from "@/test/bluesky-post";
import { renderAtExplore } from "@/test/render-with-router";

afterEach(cleanup);

describe("BlueskyPostList", () => {
  test("renders a row per post and links to the reader", async () => {
    const palindromePost = makePost();
    const plainPost = makePost({
      uri: "at://did:plc:x/app.bsky.feed.post/2",
      text: "spoon",
      author: { did: "did:plc:x", handle: "b.bsky.social", displayName: "B" },
    });
    renderAtExplore(<BlueskyPostList posts={[palindromePost, plainPost]} />);
    await screen.findAllByRole("listitem");

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
