import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import BlueskyPostList from "@/components/bluesky-post-list";
import { makePost } from "@/test/bluesky-post";

afterEach(cleanup);

describe("BlueskyPostList", () => {
  test("renders a row per post and opens one for checking", () => {
    const onCheck = vi.fn();
    render(
      <BlueskyPostList
        posts={[
          makePost(),
          makePost({ uri: "at://did:plc:x/app.bsky.feed.post/2", text: "spoon" }),
        ]}
        onCheck={onCheck}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    // only the first row contains a palindrome
    expect(screen.getAllByText("palindrome")).toHaveLength(1);
    // and the button says what a click actually does
    expect(screen.getByRole("button", { name: "Check palindrome" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "View post" })).not.toBeNull();
    // the post date is rendered as a machine-readable time element
    expect(document.querySelectorAll("time").length).toBe(2);

    fireEvent.click(screen.getByRole("button", { name: "View post" }));
    expect(onCheck).toHaveBeenCalledWith("at://did:plc:x/app.bsky.feed.post/2");
  });
});
