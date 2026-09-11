import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { useEditor } from "@tiptap/react";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import { extensions } from "@/lib/editor-schema";
import StatusBar from "@/components/status-bar";
import { stubClipboard } from "@/test/stub-clipboard";

afterEach(cleanup);

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

const shareButton = () => screen.getByRole("button", { name: "Share" });

describe("StatusBar share button", () => {
  test("is enabled for a palindrome and copies a /p link", async () => {
    const written: string[] = [];
    stubClipboard(async (text) => {
      written.push(text);
    });
    const { container } = render(<Harness content="A b, b a" />);
    const button = await screen.findByRole("button", { name: "Share" });

    expect(button.getAttribute("title")).toContain("Copy a link");

    await act(async () => {
      fireEvent.click(button);
    });

    expect(written).toEqual([`${location.origin}/p#t=${encodeURIComponent("A b, b a")}`]);
    expect(button.textContent).toContain("Copied!");
    // the sr-only live region announces the feedback for screen readers
    expect(container.querySelector('span[role="status"].sr-only')?.textContent).toContain(
      "Copied!",
    );
  });

  test("is disabled with a title when the text is not a palindrome", async () => {
    const write = vi.fn();
    stubClipboard(write);
    render(<Harness content="hello world" />);
    await screen.findByRole("status");

    expect(shareButton().getAttribute("title")).toContain("Finish the palindrome");
    fireEvent.click(shareButton());
    expect(write).not.toHaveBeenCalled();
  });

  test("is disabled for the empty document despite its vacuous palindrome", async () => {
    render(<Harness content="" />);
    await screen.findByRole("status");

    expect(shareButton().getAttribute("disabled")).toBe("");
    expect(shareButton().getAttribute("title")).toContain("Finish the palindrome");
  });
});
