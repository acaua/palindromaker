import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { useEditor } from "@tiptap/react";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import { extensions } from "@/lib/editor-schema";
import StatusBar from "@/components/status-bar";
import { stubClipboard } from "@/test/stub-clipboard";

afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

// StatusBar reads both custom plugins' state off the editor, so the
// harness builds the same extension set the real editor does
const Harness = ({ content }: { content: string }) => {
  const editor = useEditor({
    extensions: extensions({ enabled: false }),
    content,
  });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  if (!editor) return null;
  return (
    <StatusBar
      editor={editor}
      finderOpen={false}
      onToggleFinder={() => {}}
      triggerRef={triggerRef}
    />
  );
};

const shareTrigger = () => screen.getByRole("button", { name: "Share" });

const openMenu = async () => {
  const trigger = await screen.findByRole("button", { name: "Share" });
  await act(async () => {
    fireEvent.click(trigger);
  });
  return trigger;
};

describe("StatusBar share menu", () => {
  test("copies the text from the menu and flashes the trigger", async () => {
    const written: string[] = [];
    stubClipboard(async (text) => {
      written.push(text);
    });
    const { container } = render(<Harness content="A b, b a" />);
    const trigger = await openMenu();

    expect(trigger.getAttribute("title")).toContain("Share this palindrome");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy text" }));
    });

    expect(written).toEqual(["A b, b a"]);
    // the menu closed, the trigger took focus back, and it flashed
    expect(screen.queryByRole("button", { name: "Copy text" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.textContent).toContain("Copied!");
    expect(container.querySelector('span[role="status"].sr-only')?.textContent).toContain(
      "Copied!",
    );
  });

  test("copies the /p link from the menu", async () => {
    const written: string[] = [];
    stubClipboard(async (text) => {
      written.push(text);
    });
    render(<Harness content="A b, b a" />);
    await openMenu();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    });

    expect(written).toEqual([`${location.origin}/p#t=${encodeURIComponent("A b, b a")}`]);
  });

  test("opens the Bluesky composer from the menu", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<Harness content="A b, b a" />);
    await openMenu();

    fireEvent.click(screen.getByRole("button", { name: "Post to Bluesky" }));

    const text = `A b, b a\n\n${location.origin}/p#t=${encodeURIComponent("A b, b a")}`;
    expect(open).toHaveBeenCalledWith(
      `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  });

  test("disables Post to Bluesky past 300 graphemes", async () => {
    render(<Harness content={"a".repeat(301)} />);
    await openMenu();

    const post = screen.getByRole("button", { name: "Post to Bluesky" });
    expect(post.getAttribute("disabled")).toBe("");
    expect(post.getAttribute("title")).toContain("Too long");
  });

  test("Esc closes the menu and refocuses the trigger", async () => {
    render(<Harness content="A b, b a" />);
    const trigger = await openMenu();

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  test("a click outside closes the menu without stealing focus", async () => {
    render(<Harness content="A b, b a" />);
    const trigger = await openMenu();

    await act(async () => {
      fireEvent.pointerDown(document.body);
    });

    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
    // focus stays where the click landed, not on the trigger
    expect(document.activeElement).not.toBe(trigger);
  });

  test("is disabled with a reason when the text is not a palindrome", async () => {
    render(<Harness content="hello world" />);
    await screen.findByRole("status");

    expect(shareTrigger().getAttribute("disabled")).toBe("");
    expect(shareTrigger().getAttribute("title")).toContain("Finish the palindrome");
  });

  test("is disabled for the empty document despite its vacuous palindrome", async () => {
    render(<Harness content="" />);
    await screen.findByRole("status");

    expect(shareTrigger().getAttribute("disabled")).toBe("");
    expect(shareTrigger().getAttribute("title")).toContain("Finish the palindrome");
  });
});
