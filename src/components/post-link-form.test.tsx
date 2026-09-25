import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import PostLinkForm from "@/components/post-link-form";
import { resolveHandle } from "@/lib/bluesky-api";
import { BSKY_DID as DID, BSKY_URI as URI } from "@/test/bluesky-post";
import { createTestQueryClient, TestQueryClientProvider } from "@/test/query-client";

vi.mock("@/lib/bluesky-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bluesky-api")>()),
  resolveHandle: vi.fn(),
}));

const mockedResolveHandle = vi.mocked(resolveHandle);
let client: ReturnType<typeof createTestQueryClient>;

afterEach(cleanup);

beforeEach(() => {
  client = createTestQueryClient();
  vi.clearAllMocks();
});

const submitLink = (value: string) => {
  const onSubmitUrl = vi.fn();
  render(
    <TestQueryClientProvider client={client}>
      <PostLinkForm onSubmitUrl={onSubmitUrl} />
    </TestQueryClientProvider>,
  );
  fireEvent.change(screen.getByRole("textbox"), { target: { value } });
  fireEvent.submit(screen.getByRole("textbox").closest("form")!);
  return onSubmitUrl;
};

describe("PostLinkForm", () => {
  test("an at-uri is passed straight through", () => {
    const onSubmitUrl = submitLink(URI);
    expect(onSubmitUrl).toHaveBeenCalledWith(URI);
    expect(mockedResolveHandle).not.toHaveBeenCalled();
  });

  test("a handle URL is resolved to a DID first", async () => {
    mockedResolveHandle.mockResolvedValue({ ok: true, value: DID });
    const onSubmitUrl = submitLink("https://bsky.app/profile/bsky.app/post/3kq7aeuwbg42k");

    await vi.waitFor(() => expect(onSubmitUrl).toHaveBeenCalledWith(URI));
    expect(mockedResolveHandle.mock.calls[0]?.[0]).toBe("bsky.app");
  });

  test("a handle that cannot be resolved shows the error", async () => {
    mockedResolveHandle.mockResolvedValue({ ok: false, reason: "notFound" });
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

  test("ignores a resolution from an abandoned attempt", async () => {
    let resolveHandle!: (value: { ok: true; value: string }) => void;
    mockedResolveHandle.mockReturnValue(
      new Promise((resolve) => {
        resolveHandle = resolve;
      }),
    );
    const onSubmitUrl = vi.fn();
    render(
      <TestQueryClientProvider client={client}>
        <PostLinkForm onSubmitUrl={onSubmitUrl} />
      </TestQueryClientProvider>,
    );
    const input = screen.getByRole("textbox");
    fireEvent.change(input, {
      target: { value: "https://bsky.app/profile/old.bsky.social/post/3abc" },
    });
    fireEvent.submit(input.closest("form")!);
    fireEvent.change(input, { target: { value: "new input" } });

    await act(async () => {
      resolveHandle({ ok: true, value: DID });
      await Promise.resolve();
    });

    expect(onSubmitUrl).not.toHaveBeenCalled();
  });

  test("marks the form busy while resolving a handle", async () => {
    mockedResolveHandle.mockReturnValue(new Promise<{ ok: true; value: string }>(() => {}));
    render(
      <TestQueryClientProvider client={client}>
        <PostLinkForm onSubmitUrl={vi.fn()} />
      </TestQueryClientProvider>,
    );
    const input = screen.getByRole("textbox");
    fireEvent.change(input, {
      target: { value: "https://bsky.app/profile/bsky.app/post/3kq7aeuwbg42k" },
    });
    fireEvent.submit(input.closest("form")!);

    await vi.waitFor(() => expect(input.closest("form")?.getAttribute("aria-busy")).toBe("true"));
  });
});
