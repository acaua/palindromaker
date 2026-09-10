import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { editor, clearEditor, replaceAll, saved, typeText } from "./helpers";
import { mirrorWord } from "@/lib/dictionary";
import { DOC_STORAGE_KEY } from "@/lib/persistence";
import { SAMPLE_CONTENT, SAMPLE_CONTENT_PT } from "@/lib/sample";

// the status line is plain text now: role + color class, scoped apart from
// the legend swatches and result-row markers that share the color
const greenStatus = (page: Page) => page.locator('span[role="status"].text-green-700');
const redStatus = (page: Page) => page.locator('span[role="status"].text-red-700');

// the panel is open by default; the trigger toggles it
const finderTrigger = (page: Page) => page.getByRole("button", { name: "Find words" });

// decoration spans live inside the editor; scoping keeps them apart from
// the legend, whose swatches reuse the same classes
const decoration = (page: Page, className: string) => editor(page).locator(`span.${className}`);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("loads focused with the default palindrome and a green badge", async ({ page }) => {
  const editable = editor(page);

  await expect(editable).toContainText(SAMPLE_CONTENT);
  await expect(page.getByRole("textbox", { name: "Palindrome editor" })).toBeVisible();
  await expect(editable).toHaveAttribute("aria-multiline", "true");
  // a palindrome is misspelled by definition; squiggles would underline
  // the whole document
  await expect(editable).toHaveAttribute("spellcheck", "false");
  await expect(greenStatus(page)).toContainText("Palindrome");
  await expect(greenStatus(page)).toHaveAttribute("role", "status");
  await expect(greenStatus(page)).toHaveAttribute("aria-live", "polite");
  await expect(redStatus(page)).toHaveCount(0);
});

test("has no automatically detectable accessibility violations", async ({ page }) => {
  // the word finder panel is open by default
  await page.locator('input[aria-label="search words"]').fill("abac");
  await expect(page.locator('[aria-label="results"] [role="listitem"]').first()).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});

test("shows a legend explaining the highlights", async ({ page }) => {
  const editorLegend = page.locator('footer[aria-label="editor legend"]');

  for (const label of [
    "center of the palindrome",
    "breaks the palindrome",
    "mirror of your caret",
  ]) {
    await expect(editorLegend).toContainText(label);
  }

  const finderLegend = page.locator('footer[aria-label="word finder legend"]');
  for (const label of ["mirror is also a word", "palindrome word"]) {
    await expect(finderLegend).toContainText(label);
  }
});

test("shows a red badge for non-palindrome text", async ({ page }) => {
  await replaceAll(page, "hello world");

  await expect(redStatus(page)).toContainText("palindrome");
  await expect(greenStatus(page)).toHaveCount(0);
  // nothing pairs up here, so there is no center: the gap highlight still
  // has to show what breaks the palindrome
  await expect(decoration(page, "bg-red-300")).toBeVisible();
  await expect(decoration(page, "bg-blue-200")).toHaveCount(0);
});

test("highlights the center characters of a palindrome", async ({ page }) => {
  await replaceAll(page, "A b, b a");

  await expect(greenStatus(page)).toBeVisible();
  await expect(decoration(page, "bg-blue-200")).toHaveCount(2);
  await expect(decoration(page, "bg-red-300")).toHaveCount(0);
});

test("shows the gap highlight when text is not a palindrome", async ({ page }) => {
  await replaceAll(page, "abc a");

  await expect(redStatus(page)).toBeVisible();
  await expect(decoration(page, "bg-red-300")).toBeVisible();
});

test("highlights the mirrored character of the caret position", async ({ page }) => {
  await replaceAll(page, "A b, b a");
  // Move from the end to the first "b". Unlike Home, ArrowLeft does not
  // become a page-scrolling command when the responsive workspace is taller
  // than the viewport.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("ArrowLeft");
  }

  // caret is on the first "b" (index 2), mirrored by the "b" at index 5
  await expect(decoration(page, "bg-purple-200")).toBeVisible();
  await expect(decoration(page, "bg-purple-400")).toBeVisible();
});

test("handles multiple paragraphs without crashing", async ({ page }) => {
  await clearEditor(page);
  await typeText(page, "ab");
  await page.keyboard.press("Enter");
  await typeText(page, "ba");

  // "ab\nba" is a palindrome once the newline is skipped
  await expect(greenStatus(page)).toBeVisible();

  // decorations for the selected mirrored character must not crash
  await page.keyboard.press("Home");
  await page.waitForTimeout(200);
  await expect(greenStatus(page)).toBeVisible();
});

test("mirror editing duplicates and removes mirrored characters", async ({ page }) => {
  // the status bar switch, not the word "mirror" inside result rows
  const mirrorToggle = page.getByRole("button", { name: "Mirror typing" });
  await mirrorToggle.click();
  await expect(mirrorToggle).toHaveAttribute("aria-pressed", "true");

  await clearEditor(page);
  await typeText(page, "abc");

  // the first char becomes the center, every next keystroke is duplicated
  await expect(editor(page)).toContainText("cbabc");
  await expect(greenStatus(page)).toBeVisible();

  // backspace removes the mirrored pair
  await page.keyboard.press("Backspace");
  await expect(editor(page)).toContainText("bab");
  await expect(greenStatus(page)).toBeVisible();

  // toggling off stops the duplication
  await mirrorToggle.click();
  await typeText(page, "x");
  await expect(editor(page)).toContainText("babx");
  await expect(mirrorToggle).toHaveAttribute("aria-pressed", "false");
});

test("persists editor content across reloads", async ({ page }) => {
  await replaceAll(page, "racecar");
  await expect(greenStatus(page)).toBeVisible();

  // the pending debounced save is flushed on unload
  await page.reload();

  await expect(editor(page)).toContainText("racecar");
});

test("persists the mirror toggle, the panel, and the language across reloads", async ({ page }) => {
  // the status bar switch, not the word "mirror" inside result rows
  const mirrorToggle = page.getByRole("button", { name: "Mirror typing" });
  await mirrorToggle.click();
  await expect(mirrorToggle).toHaveAttribute("aria-pressed", "true");

  // the panel is open by default: the language is there without opening
  await page.locator('select[aria-label="dictionary language"]').selectOption("en");

  await page.reload();

  await expect(mirrorToggle).toHaveAttribute("aria-pressed", "true");
  await expect(finderTrigger(page)).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('select[aria-label="dictionary language"]')).toHaveValue("en");

  // closing the panel is remembered too
  await finderTrigger(page).click();
  await expect(page.getByLabel("word finder")).toHaveCount(0);

  await page.reload();
  await expect(finderTrigger(page)).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByLabel("word finder")).toHaveCount(0);

  // and so is reopening it
  await finderTrigger(page).click();
  await expect(finderTrigger(page)).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('select[aria-label="dictionary language"]')).toHaveValue("en");
});

test("the panel's ✕ closes it and hands focus back to the trigger", async ({ page }) => {
  await page.getByRole("button", { name: "Close word finder" }).click();

  await expect(page.getByLabel("word finder")).toHaveCount(0);
  await expect(finderTrigger(page)).toHaveAttribute("aria-expanded", "false");
  // the ✕ vanished under the pointer, so focus must not be lost
  await expect(finderTrigger(page)).toBeFocused();

  await finderTrigger(page).click();
  await expect(page.locator('select[aria-label="dictionary language"]')).toBeVisible();
  await expect(finderTrigger(page)).toBeFocused();
});

test("falls back to the sample palindrome when storage is corrupt", async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "not json");
  }, DOC_STORAGE_KEY);

  await page.reload();

  await expect(editor(page)).toContainText(SAMPLE_CONTENT);
});

test("falls back to the sample palindrome when storage holds unknown nodes", async ({ page }) => {
  // parseable JSON the editor schema rejects would crash during render
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({ type: "doc", content: [{ type: "bogus" }] }));
  }, DOC_STORAGE_KEY);

  await page.reload();

  await expect(editor(page)).toContainText(SAMPLE_CONTENT);
});

test.describe("two tabs", () => {
  const conflictBar = (page: Page) => page.getByRole("alert");

  const openTab = async (context: BrowserContext) => {
    const page = await context.newPage();
    await page.goto("/");
    await expect(editor(page)).toBeVisible();
    return page;
  };

  // the debounced save is what the other tab reacts to, so each step waits
  // for it (the shared `saved` helper) to land; without that the two tabs
  // race and whichever happens to be edited first is the one asked about
  // the conflict

  test("an untouched tab picks up what the other tab saved", async ({ context }) => {
    const first = await openTab(context);
    const second = await openTab(context);

    await replaceAll(first, "racecar");
    await saved(first, "racecar");

    // the second tab was never edited, so it has nothing to lose
    await expect(editor(second)).toContainText("racecar");
    await expect(conflictBar(second)).toHaveCount(0);
    await expect(greenStatus(second)).toBeVisible();
  });

  test("a tab with its own edits is asked which version to keep", async ({ context }) => {
    const first = await openTab(context);
    const second = await openTab(context);

    await replaceAll(second, "level");
    await saved(second, "level");
    // the first tab has no edits yet, so it takes "level" silently
    await expect(editor(first)).toContainText("level");

    await replaceAll(first, "racecar");
    await saved(first, "racecar");

    // now both tabs have been edited: neither version can be thrown away
    await expect(conflictBar(second)).toContainText("edited in another tab");
    await expect(editor(second)).toContainText("level");

    await conflictBar(second).getByRole("button", { name: "Load that version" }).click();

    await expect(editor(second)).toContainText("racecar");
    await expect(conflictBar(second)).toHaveCount(0);
  });

  test("keeping this tab's version overwrites the other one", async ({ context }) => {
    const first = await openTab(context);
    const second = await openTab(context);

    await replaceAll(second, "level");
    await saved(second, "level");
    await expect(editor(first)).toContainText("level");

    await replaceAll(first, "racecar");
    await saved(first, "racecar");
    await expect(conflictBar(second)).toBeVisible();

    await conflictBar(second).getByRole("button", { name: "Keep this one" }).click();

    await expect(conflictBar(second)).toHaveCount(0);
    await expect(editor(second)).toContainText("level");
    await saved(second, "level");

    // the first tab has edits of its own, so it is asked rather than
    // having "racecar" replaced behind the user's back
    await expect(conflictBar(first)).toBeVisible();
    await expect(editor(first)).toContainText("racecar");

    await second.reload();
    await expect(editor(second)).toContainText("level");
  });
});

test("keeps working when the browser blocks site storage", async ({ page }) => {
  // Chrome and Safari throw on access (not just on read) when storage is
  // blocked, e.g. in an iframe or with cookies disabled
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError: storage is blocked");
      },
    });
  });

  await page.reload();

  await expect(editor(page)).toContainText(SAMPLE_CONTENT);
  await expect(greenStatus(page)).toBeVisible();

  // editing still works, it just is not remembered
  await replaceAll(page, "hello world");
  await expect(redStatus(page)).toBeVisible();

  // the status bar switch, not the word "mirror" inside result rows
  const mirrorToggle = page.getByRole("button", { name: "Mirror typing" });
  await mirrorToggle.click();
  await expect(mirrorToggle).toHaveAttribute("aria-pressed", "true");
});

test("word finder searches the pt-br dictionary and shows mirrors", async ({ page }) => {
  const searchInput = page.locator('input[aria-label="search words"]');
  await expect(searchInput).toBeVisible();

  // "abacate" is the first word starting with "abac"; its mirror differs
  await searchInput.fill("abac");
  const results = page.locator('[aria-label="results"] [role="listitem"]');
  await expect(results.first()).toContainText("abacate");

  const word = (await results.first().locator("span").first().textContent()) ?? "";
  await expect(results.first().locator("span").last()).toHaveText(mirrorWord(word));

  await page.locator('button:has-text("ends with")').click();
  await searchInput.fill("ate");
  await expect(results.first()).toContainText("abacate");

  // switching the language reloads the dictionary and re-runs the search
  const language = page.locator('select[aria-label="dictionary language"]');
  await expect(language).toHaveValue("pt-br");
  await language.selectOption("en");
  await searchInput.fill("hello");
  await expect(results.first()).toContainText("hello");
  await expect(results.first().locator("span").last()).toHaveText("olleh");
});

test("loading a dictionary does not block the page", async ({ page }) => {
  // the largest dictionary is 7 MB / 635k words: normalizing and
  // deduplicating it used to block the main thread for ~250ms
  await page.evaluate(() => {
    const durations: number[] = [];
    (window as unknown as { longTasks: number[] }).longTasks = durations;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) durations.push(entry.duration);
    }).observe({ entryTypes: ["longtask"] });
  });

  await page.locator('select[aria-label="dictionary language"]').selectOption("es");
  await page.locator('input[aria-label="search words"]').fill("casa");
  await expect(page.locator('[aria-label="results"] [role="listitem"]').first()).toContainText(
    "casa",
  );

  const longTasks = await page.evaluate(
    () => (window as unknown as { longTasks: number[] }).longTasks,
  );
  // slices are ~10ms of work here; the ceiling leaves room for a slow CI
  // machine while still catching a return to one big blocking build
  expect(Math.max(0, ...longTasks)).toBeLessThan(150);
});

test("word finder recovers from a failed dictionary load", async ({ page }) => {
  const searchInput = page.locator('input[aria-label="search words"]');
  const results = page.locator('[aria-label="results"] [role="listitem"]');
  await searchInput.fill("abac");
  await expect(results.first()).toContainText("abacate");

  // the next language fails to load
  let failing = true;
  await page.route("**/dictionary/en.txt", (route) => (failing ? route.abort() : route.continue()));
  await page.locator('select[aria-label="dictionary language"]').selectOption("en");

  await expect(page.getByText("failed to load dictionary")).toBeVisible();

  // the previous language's words must not linger under the error: search
  // again and give the debounce time to produce them before checking
  await searchInput.fill("abacat");
  await page.waitForTimeout(400);
  await expect(results).toHaveCount(0);

  failing = false;
  await page.getByRole("button", { name: "retry" }).click();

  await expect(page.getByText("failed to load dictionary")).toHaveCount(0);
  await searchInput.fill("hello");
  await expect(results.first()).toContainText("hello");
});

test("word finder marks mirror pairs and palindromes", async ({ page }) => {
  const searchInput = page.locator('input[aria-label="search words"]');
  const results = page.locator('[aria-label="results"] [role="listitem"]');

  // "amor" mirrors to "roma", which is also a dictionary word
  await searchInput.fill("amor");
  await expect(results.first()).toContainText("amor");
  await expect(results.first().locator("span.text-purple-700")).toBeVisible();

  // "radar" is itself a palindrome
  await searchInput.fill("radar");
  await expect(results.first()).toContainText("radar");
  await expect(results.first().locator("span.text-green-700")).toBeVisible();

  // "abacate" mirrors to "etacaba", not a word: no markers
  await searchInput.fill("abac");
  await expect(results.first()).toContainText("abacate");
  await expect(results.first().locator("span.text-purple-700")).toHaveCount(0);
  await expect(results.first().locator("span.text-green-700")).toHaveCount(0);
});

test("clicking a result inserts the word, and its mirror opposite", async ({ page }) => {
  // the status bar switch, not the word "mirror" inside result rows
  const mirrorToggle = page.getByRole("button", { name: "Mirror typing" });
  await mirrorToggle.click();
  await clearEditor(page);

  const searchInput = page.locator('input[aria-label="search words"]');
  const results = page.locator('[aria-label="results"] [role="listitem"]');
  await searchInput.fill("amor");
  await expect(results.first()).toContainText("amor");

  // whichever word tops the list: the row inserts what it displays
  const word = (await results.first().locator("span").first().textContent()) ?? "";
  await results.first().locator("button").click();

  await expect(editor(page)).toHaveText(`${word} ${mirrorWord(word)}`);
  await expect(greenStatus(page)).toBeVisible();

  // the caret was left between the word and its mirror, and the editor
  // takes the focus back, so typing goes on mirroring from there
  await expect(editor(page)).toBeFocused();
  await typeText(page, "x");
  await expect(editor(page)).toHaveText(`${word}x x${mirrorWord(word)}`);
  await expect(greenStatus(page)).toBeVisible();

  // with the toggle off a click inserts at the caret alone
  await mirrorToggle.click();
  await searchInput.fill("casa");
  await expect(results.first()).toContainText("casa");
  const second = (await results.first().locator("span").first().textContent()) ?? "";
  await results.first().locator("button").click();

  await expect(editor(page)).toHaveText(`${word}x ${second} x${mirrorWord(word)}`);
  await expect(redStatus(page)).toBeVisible();
});

test("word finder virtualizes broad result sets", async ({ page }) => {
  const searchInput = page.locator('input[aria-label="search words"]');
  // ~37k words start with "a" in the pt-br dictionary
  await searchInput.fill("a");

  const scroller = page.locator('div[aria-label="results"]');
  const rows = page.locator('[aria-label="results"] [role="listitem"]');
  await expect(rows.first()).toContainText("a");
  await expect(rows.first()).toHaveAttribute("aria-posinset", "1");
  await expect(rows.first()).toHaveAttribute("aria-setsize", /^\d+$/);

  // the full list is virtualized: only a small window of rows exists
  expect(await rows.count()).toBeLessThan(100);
  const scrollHeight = await scroller.evaluate((element) => element.scrollHeight);
  expect(scrollHeight).toBeGreaterThan(1_000_000);

  // scrolling to the bottom swaps the rendered window, never grows it
  const firstRowBefore = await rows.first().locator("span").first().textContent();
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(rows.first().locator("span").first()).not.toHaveText(firstRowBefore!);
  expect(await rows.count()).toBeLessThan(100);
});

// the suite runs with Playwright's default en-US locale everywhere else
test.describe("pt-BR browser locale", () => {
  test.use({ locale: "pt-BR" });

  test("detects the browser language: pt UI, pt sample, pt document lang", async ({ page }) => {
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("textbox", { name: "Editor de palíndromos" })).toBeVisible();
    await expect(editor(page)).toContainText(SAMPLE_CONTENT_PT);
    await expect(greenStatus(page)).toContainText("Palíndromo");
    // exact: the finder's "idioma do dicionário" select must not match too
    await expect(page.getByRole("combobox", { name: "Idioma", exact: true })).toHaveValue("pt");
  });
});

test("the header switch changes the language and remembers it", async ({ page }) => {
  const html = page.locator("html");
  // exact: the finder's "dictionary language" select must not match too
  const uiLanguage = page.getByRole("combobox", {
    name: "Language",
    exact: true,
  });
  await expect(html).toHaveAttribute("lang", "en");
  await expect(uiLanguage).toHaveValue("en");

  await uiLanguage.selectOption("pt");

  await expect(html).toHaveAttribute("lang", "pt-BR");
  await expect(greenStatus(page)).toContainText("Palíndromo");

  // the choice survives a reload, like the mirror toggle
  await page.reload();
  await expect(html).toHaveAttribute("lang", "pt-BR");

  // the accessible name follows the language, so re-locate in pt
  await page.getByRole("combobox", { name: "Idioma", exact: true }).selectOption("en");
  await expect(html).toHaveAttribute("lang", "en");
});
