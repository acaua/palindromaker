import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import StatusBar from "@/components/status-bar";
import type { EditorFacts } from "@/lib/editor-facts";
import { stubClipboard } from "@/test/stub-clipboard";

afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

const raw = "A b, b a";

const facts = (overrides: Partial<EditorFacts> = {}): EditorFacts => ({
  hasLetters: true,
  isPalindrome: true,
  mirrorEnabled: false,
  insertMode: "mirrored",
  raw,
  overLimit: false,
  shareable: true,
  ...overrides,
});

// StatusBar is presentational: the editor state arrives as facts, so the
// test needs no ProseMirror harness
const Harness = ({ value }: { value: EditorFacts }) => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <StatusBar
      facts={value}
      onToggleMirror={() => {}}
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
    const { container } = render(<Harness value={facts()} />);
    const trigger = await openMenu();

    expect(trigger.getAttribute("title")).toContain("Share this palindrome");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy text" }));
    });

    expect(written).toEqual([raw]);
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
    render(<Harness value={facts()} />);
    await openMenu();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    });

    expect(written).toEqual([`${location.origin}/p#t=${encodeURIComponent(raw)}`]);
  });

  test("opens the Bluesky composer from the menu", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<Harness value={facts()} />);
    await openMenu();

    fireEvent.click(screen.getByRole("button", { name: "Post to Bluesky" }));

    const text = `${raw}\n\n${location.origin}/p#t=${encodeURIComponent(raw)}`;
    expect(open).toHaveBeenCalledWith(
      `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  });

  test("disables Post to Bluesky past 300 graphemes", async () => {
    render(<Harness value={facts({ raw: "a".repeat(301) })} />);
    await openMenu();

    const post = screen.getByRole("button", { name: "Post to Bluesky" });
    expect(post.getAttribute("disabled")).toBe("");
    expect(post.getAttribute("title")).toContain("Too long");
  });

  test("Esc closes the menu and refocuses the trigger", async () => {
    render(<Harness value={facts()} />);
    const trigger = await openMenu();

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  test("a click outside closes the menu without stealing focus", async () => {
    render(<Harness value={facts()} />);
    const trigger = await openMenu();

    await act(async () => {
      fireEvent.pointerDown(document.body);
    });

    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
    // focus stays where the click landed, not on the trigger
    expect(document.activeElement).not.toBe(trigger);
  });

  test("is disabled with a reason when the text is not a palindrome", async () => {
    render(<Harness value={facts({ isPalindrome: false, shareable: false })} />);
    await screen.findByRole("status");

    expect(shareTrigger().getAttribute("disabled")).toBe("");
    expect(shareTrigger().getAttribute("title")).toContain("Finish the palindrome");
  });

  test("is disabled with the length reason when the text is over the cap", async () => {
    render(<Harness value={facts({ overLimit: true, shareable: false })} />);
    await screen.findByRole("status");

    expect(shareTrigger().getAttribute("disabled")).toBe("");
    expect(shareTrigger().getAttribute("title")).toContain("too long to share");
  });

  test("is disabled for the empty document despite its vacuous palindrome", async () => {
    render(<Harness value={facts({ hasLetters: false, shareable: false, raw: "" })} />);
    await screen.findByRole("status");

    expect(shareTrigger().getAttribute("disabled")).toBe("");
    expect(shareTrigger().getAttribute("title")).toContain("Finish the palindrome");
  });
});
