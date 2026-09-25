import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import type { RefObject } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import Editor from "@/components/editor";
import type { FinderHandle } from "@/components/editor";
import type { EditorSession } from "@/lib/editor-session";
import { readPrefs } from "@/lib/prefs";
import { textToDoc } from "@/lib/share-link";
import { renderWithQuery } from "@/test/query-client";

// the real loader fetches megabytes; the panel only needs it to settle
vi.mock("@/lib/dictionary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dictionary")>();
  return (await import("@/test/dictionary-mock")).withTestDictionary(actual);
});

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
});

// the editor is seeded from one resolved session and one finder handle — the
// two props the page hands it; writes go through the shared prefs store
const makeSession = (overrides: Partial<EditorSession> = {}): EditorSession => ({
  content: textToDoc("A b, b a"),
  mirrorEnabled: false,
  finderOpen: false,
  ...overrides,
});

const makeFinder = (open = false): FinderHandle => ({
  open,
  toggle: vi.fn(),
  close: vi.fn(),
  triggerRef: { current: null } as RefObject<HTMLButtonElement | null>,
});

const renderEditor = (session: EditorSession, finder = makeFinder()) => {
  renderWithQuery(<Editor session={session} finder={finder} />);
  return finder;
};

describe("Editor", () => {
  test("renders the seeded document in the labelled textbox", async () => {
    renderEditor(makeSession());

    const textbox = await screen.findByRole("textbox", { name: "Palindrome editor" });
    expect(textbox.textContent).toContain("A b, b a");
  });

  test("the footer reports a palindrome", async () => {
    renderEditor(makeSession({ content: textToDoc("A b, b a") }));

    expect((await screen.findByRole("status")).textContent).toBe("Palindrome");
  });

  test("the footer reports a non-palindrome", async () => {
    renderEditor(makeSession({ content: textToDoc("A b, c a") }));

    expect((await screen.findByRole("status")).textContent).toBe("Not a palindrome");
  });

  test("the share control stays disabled until the text is a palindrome", async () => {
    renderEditor(makeSession({ content: textToDoc("A b, c a") }));

    const share = await screen.findByRole("button", { name: "Share" });
    expect((share as HTMLButtonElement).disabled).toBe(true);
    expect(share.getAttribute("title")).toBe("Finish the palindrome first");
  });

  test("toggling mirror editing flips the switch and writes the pref once", async () => {
    const session = makeSession();
    renderEditor(session);

    const toggle = await screen.findByRole("button", { name: "Mirror editing" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(toggle);

    await waitFor(() => expect(readPrefs(localStorage).mirrorEnabled).toBe(true));
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });

  test("the finder trigger asks the page to toggle the panel", async () => {
    const finder = renderEditor(makeSession());

    fireEvent.click(await screen.findByRole("button", { name: "Find words" }));

    expect(finder.toggle).toHaveBeenCalledTimes(1);
  });
});
