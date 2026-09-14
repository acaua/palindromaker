import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import EditorPage from "@/components/editor-page";
import { readPrefs } from "@/lib/prefs";
import { DOC_STORAGE_KEY } from "@/lib/persistence";

vi.mock("@/lib/dictionary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dictionary")>();
  return (await import("@/test/dictionary-mock")).withTestDictionary(actual);
});

afterEach(cleanup);

afterEach(() => {
  window.location.hash = "";
});

beforeEach(() => {
  localStorage.clear();
});

describe("EditorPage", () => {
  test("opens on the shared #t= fragment and consumes it", async () => {
    window.location.hash = "#t=A%20b%2C%20b%20a";

    render(<EditorPage />);

    const textbox = await screen.findByRole("textbox", { name: "Palindrome editor" });
    expect(textbox.textContent).toContain("A b, b a");
    // consumed, so a reload after "Edit this" falls back to storage
    await waitFor(() => expect(window.location.hash).toBe(""));
  });

  test("a stored document wins over the sample", async () => {
    localStorage.setItem(
      DOC_STORAGE_KEY,
      JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "roma é amor" }] }],
      }),
    );

    render(<EditorPage />);

    const textbox = await screen.findByRole("textbox", { name: "Palindrome editor" });
    expect(textbox.textContent).toContain("roma é amor");
  });

  test("closing the finder remembers it and returns focus to the trigger", async () => {
    render(<EditorPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Close word finder" }));

    expect(readPrefs(localStorage).finderOpen).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Find words" }));
  });
});
