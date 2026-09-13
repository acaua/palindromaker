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

    fireEvent.click(screen.getAllByRole("button", { name: "Check palindrome" })[1]);
    expect(onCheck).toHaveBeenCalledWith("at://did:plc:x/app.bsky.feed.post/2");
  });
});
