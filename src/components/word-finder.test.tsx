import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import WordFinder from "@/components/word-finder";
import { buildDictionary, loadDictionary } from "@/lib/dictionary";
import type { Dictionary, Language } from "@/lib/dictionary";
import { PREFS_STORAGE_KEY, readStoredPrefs } from "@/lib/persistence";
import type { WordInsertMode } from "@/lib/word-insert";

// the real loader fetches megabytes; these dictionaries are a handful of
// words, and every other export stays real
vi.mock("@/lib/dictionary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/dictionary")>()),
  loadDictionary: vi.fn(),
}));

const dictionaries: Partial<Record<Language, Dictionary>> = {
  "pt-br": buildDictionary(["ovo", "amor", "amora", "roma"].join("\n")),
  en: buildDictionary(["hello", "level"].join("\n")),
};

// languages the test wants to fail rather than answer
let failing: Set<Language>;

const onInsertWord = vi.fn();

// the panel as the editor mounts it; the insert mode is whatever the
// editor's state says a click would do
const renderPanel = (insertMode: WordInsertMode = "caret") =>
  render(<WordFinder onInsertWord={onInsertWord} insertMode={insertMode} />);

const open = () =>
  fireEvent.click(screen.getByRole("button", { name: /find words/i }));

// the panel with its dictionary loaded; an empty search shows no list, so
// "loaded" is the loading line going away rather than results appearing
const openLoaded = async () => {
  open();
  await waitFor(() =>
    expect(screen.queryByText("loading dictionary…")).toBeNull(),
  );
};

const type = (query: string) =>
  fireEvent.change(screen.getByLabelText("search words"), {
    target: { value: query },
  });

const languageSelect = () =>
  screen.getByLabelText<HTMLSelectElement>("dictionary language");

const chooseLanguage = (language: Language) =>
  fireEvent.change(languageSelect(), { target: { value: language } });

const rowText = () =>
  screen.queryAllByRole("listitem").map((row) => row.textContent);

beforeEach(() => {
  localStorage.clear();
  failing = new Set();
  onInsertWord.mockReset();
  vi.mocked(loadDictionary).mockReset();
  vi.mocked(loadDictionary).mockImplementation(async (language) => {
    if (failing.has(language)) throw new Error(`cannot load ${language}`);
    const dictionary = dictionaries[language];
    if (!dictionary) throw new Error(`no test dictionary for ${language}`);
    return dictionary;
  });
});

describe("WordFinder", () => {
  test("loads nothing until the panel is opened", async () => {
    renderPanel();

    expect(screen.queryByLabelText("search words")).toBeNull();
    expect(loadDictionary).not.toHaveBeenCalled();

    open();
    expect(screen.getByText("loading dictionary…")).toBeTruthy();
    expect(loadDictionary).toHaveBeenCalledWith("pt-br");

    await waitFor(() =>
      expect(screen.queryByText("loading dictionary…")).toBeNull(),
    );
  });

  test("a search reports its matches, and says so when there are none", async () => {
    renderPanel();
    await openLoaded();

    type("ovo");
    // the results header counts every match, not just the rendered rows
    expect(await screen.findByText("Mirror · 1 result")).toBeTruthy();

    type("zz");
    expect(await screen.findByText("No matches")).toBeTruthy();
    expect(screen.queryByLabelText("results")).toBeNull();
  });

  test("a failed load reports the error and keeps no results on screen", async () => {
    renderPanel();
    open();
    type("ovo");
    expect(await screen.findByText("Mirror · 1 result")).toBeTruthy();

    failing.add("en");
    chooseLanguage("en");

    expect(await screen.findByText(/failed to load dictionary/)).toBeTruthy();
    // the previous language's words must not linger under the error
    expect(screen.queryByLabelText("results")).toBeNull();
  });

  test("retrying a failed language recovers", async () => {
    failing.add("pt-br");
    renderPanel();
    open();
    await screen.findByText(/failed to load dictionary/);

    failing.delete("pt-br");
    fireEvent.click(screen.getByRole("button", { name: "retry" }));

    await waitFor(() =>
      expect(screen.queryByText(/failed to load dictionary/)).toBeNull(),
    );
    type("ovo");
    expect(await screen.findByText("Mirror · 1 result")).toBeTruthy();
  });

  test("the match position picks where the letters have to appear", async () => {
    renderPanel();
    await openLoaded();

    // of "amor" and "amora", neither starts with "mor", one ends with it
    // and both contain it
    type("mor");
    expect(await screen.findByText("No matches")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "ends with" }));
    expect(await screen.findByText("Mirror · 1 result")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "contains" }));
    expect(await screen.findByText("Mirror · 2 results")).toBeTruthy();
  });

  test("the chosen language is remembered for the next visit", async () => {
    const { unmount } = renderPanel();
    open();
    chooseLanguage("en");
    await waitFor(() => expect(loadDictionary).toHaveBeenCalledWith("en"));

    expect(readStoredPrefs(localStorage).lang).toBe("en");

    unmount();
    renderPanel();
    open();
    expect(languageSelect().value).toBe("en");
  });

  test("unreadable stored prefs fall back to the default language", async () => {
    localStorage.setItem(PREFS_STORAGE_KEY, "{ not json");
    renderPanel();
    open();

    expect(languageSelect().value).toBe("pt-br");
    await waitFor(() => expect(loadDictionary).toHaveBeenCalledWith("pt-br"));
  });

  test("the panel says what clicking a word will do", async () => {
    const { unmount } = renderPanel("mirrored");
    open();
    expect(
      screen.getByText(/insert it at the caret, and its mirror opposite/),
    ).toBeTruthy();
    unmount();

    renderPanel("paused");
    open();
    expect(screen.getByText(/Mirroring resumes/)).toBeTruthy();
  });

  // Rows come from a virtualizer, which measures its scroll container:
  // happy-dom has no layout, so the container is 0px tall and no row is
  // ever in view. Row rendering is covered directly in
  // word-finder-results.test.tsx, and in the Playwright suite.
  test("renders no rows without layout", async () => {
    renderPanel();
    open();
    type("ovo");
    await screen.findByText("Mirror · 1 result");

    expect(rowText()).toEqual([]);
  });
});
