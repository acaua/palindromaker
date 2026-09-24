import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import PostLinkForm from "@/components/post-link-form";
import { resolvePostRef } from "@/lib/bluesky-api";
import { BSKY_URI as URI } from "@/test/bluesky-post";

vi.mock("@/lib/bluesky-api", () => ({
  resolvePostRef: vi.fn(),
}));

const mockedResolvePostRef = vi.mocked(resolvePostRef);

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

const submitLink = (value: string) => {
  const onSubmitUrl = vi.fn();
  render(<PostLinkForm onSubmitUrl={onSubmitUrl} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value } });
  fireEvent.submit(screen.getByRole("textbox").closest("form")!);
  return onSubmitUrl;
};

describe("PostLinkForm", () => {
  test("an at-uri is passed straight through", () => {
    const onSubmitUrl = submitLink(URI);
    expect(onSubmitUrl).toHaveBeenCalledWith(URI);
    expect(mockedResolvePostRef).not.toHaveBeenCalled();
  });

  test("a handle URL is resolved to a DID first", async () => {
    mockedResolvePostRef.mockResolvedValue({ ok: true, value: URI });
    const onSubmitUrl = submitLink("https://bsky.app/profile/bsky.app/post/3kq7aeuwbg42k");

    await vi.waitFor(() => expect(onSubmitUrl).toHaveBeenCalledWith(URI));
    expect(mockedResolvePostRef).toHaveBeenCalledWith({
      kind: "handle",
      handle: "bsky.app",
      rkey: "3kq7aeuwbg42k",
    });
  });

  test("a handle that cannot be resolved shows the error", async () => {
    mockedResolvePostRef.mockResolvedValue({ ok: false, reason: "notFound" });
    const onSubmitUrl = submitLink("https://bsky.app/profile/nope/post/3abc");

    await vi.waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Bluesky post link"),
    );
    expect(onSubmitUrl).not.toHaveBeenCalled();
  });

  test("junk shows an error and submits nothing", () => {
    const onSubmitUrl = submitLink("hello world");
    expect(onSubmitUrl).not.toHaveBeenCalled();
    const input = screen.getByRole("textbox");
    const alert = screen.getByRole("alert");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(alert.getAttribute("id"));
    expect(alert.textContent).toContain("Bluesky post link");
  });

  test("marks the form busy while resolving a handle", async () => {
    mockedResolvePostRef.mockReturnValue(new Promise<{ ok: true; value: string }>(() => {}));
    render(<PostLinkForm onSubmitUrl={vi.fn()} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, {
      target: { value: "https://bsky.app/profile/bsky.app/post/3kq7aeuwbg42k" },
    });
    fireEvent.submit(input.closest("form")!);

    await vi.waitFor(() => expect(input.closest("form")?.getAttribute("aria-busy")).toBe("true"));
  });
});
