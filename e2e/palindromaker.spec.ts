import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const editor = (page: Page) => page.locator('[contenteditable="true"]');

const greenBadge = (page: Page) => page.locator("span.bg-green-100");
const redBadge = (page: Page) => page.locator("span.bg-red-100");

// decoration spans live inside the editor; scoping keeps them apart from
// the legend, whose swatches reuse the same classes
const decoration = (page: Page, className: string) =>
  editor(page).locator(`span.${className}`);

// ProseMirror needs realistic keystroke pacing for its selection
// sync to keep up with synthetic CDP input
async function clearEditor(page: Page) {
  const editable = editor(page);
  await editable.click();
  await page.keyboard.press("End");
  await page.waitForTimeout(100);
  // bound the loop to the current text; textContent drops the "\n"
  // between blocks, so keep a margin for paragraph separators
  const length = ((await editable.textContent()) ?? "").length;
  for (let i = 0; i < length + 5; i++) {
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(15);
  }
}

async function type(page: Page, text: string) {
  await page.keyboard.type(text, { delay: 30 });
}

async function replaceAll(page: Page, text: string) {
  await clearEditor(page);
  await type(page, text);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("loads focused with the default palindrome and a green badge", async ({
  page,
}) => {
  const editable = editor(page);

  await expect(editable).toContainText("Eva, can I stab bats in a cave?");
  await expect(
    page.getByRole("textbox", { name: "Palindrome editor" }),
  ).toBeVisible();
  await expect(editable).toHaveAttribute("aria-multiline", "true");
  await expect(greenBadge(page)).toContainText("Palindrome");
  await expect(greenBadge(page)).toHaveAttribute("role", "status");
  await expect(greenBadge(page)).toHaveAttribute("aria-live", "polite");
  await expect(redBadge(page)).toHaveCount(0);
});

test("has no automatically detectable accessibility violations", async ({
  page,
}) => {
  await page.locator('button:has-text("find words")').click();
  await page.locator('input[aria-label="search words"]').fill("abac");
  await expect(
    page.locator('[aria-label="results"] [role="listitem"]').first(),
  ).toBeVisible();

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

  await page.locator('button:has-text("Find words")').click();
  const finderLegend = page.locator('footer[aria-label="word finder legend"]');
  for (const label of ["mirror is also a word", "palindrome word"]) {
    await expect(finderLegend).toContainText(label);
  }
});

test("shows a red badge for non-palindrome text", async ({ page }) => {
  await replaceAll(page, "hello world");

  await expect(redBadge(page)).toContainText("palindrome");
  await expect(greenBadge(page)).toHaveCount(0);
  // nothing pairs up here, so there is no center: the gap highlight still
  // has to show what breaks the palindrome
  await expect(decoration(page, "bg-red-300")).toBeVisible();
  await expect(decoration(page, "bg-blue-200")).toHaveCount(0);
});

test("highlights the center characters of a palindrome", async ({ page }) => {
  await replaceAll(page, "A b, b a");

  await expect(greenBadge(page)).toBeVisible();
  await expect(decoration(page, "bg-blue-200")).toHaveCount(2);
  await expect(decoration(page, "bg-red-300")).toHaveCount(0);
});

test("shows the gap highlight when text is not a palindrome", async ({
  page,
}) => {
  await replaceAll(page, "abc a");

  await expect(redBadge(page)).toBeVisible();
  await expect(decoration(page, "bg-red-300")).toBeVisible();
});

test("highlights the mirrored character of the caret position", async ({
  page,
}) => {
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
  await type(page, "ab");
  await page.keyboard.press("Enter");
  await type(page, "ba");

  // "ab\nba" is a palindrome once the newline is skipped
  await expect(greenBadge(page)).toBeVisible();

  // decorations for the selected mirrored character must not crash
  await page.keyboard.press("Home");
  await page.waitForTimeout(200);
  await expect(greenBadge(page)).toBeVisible();
});

test("mirror editing duplicates and removes mirrored characters", async ({
  page,
}) => {
  const mirrorToggle = page.locator('button:has-text("mirror")');
  await mirrorToggle.click();
  await expect(mirrorToggle).toHaveAttribute("aria-pressed", "true");

  await clearEditor(page);
  await type(page, "abc");

  // the first char becomes the center, every next keystroke is duplicated
  await expect(editor(page)).toContainText("cbabc");
  await expect(greenBadge(page)).toBeVisible();

  // backspace removes the mirrored pair
  await page.keyboard.press("Backspace");
  await expect(editor(page)).toContainText("bab");
  await expect(greenBadge(page)).toBeVisible();

  // toggling off stops the duplication
  await mirrorToggle.click();
  await type(page, "x");
  await expect(editor(page)).toContainText("babx");
  await expect(mirrorToggle).toHaveAttribute("aria-pressed", "false");
});

test("persists editor content across reloads", async ({ page }) => {
  await replaceAll(page, "racecar");
  await expect(greenBadge(page)).toBeVisible();

  // the pending debounced save is flushed on unload
  await page.reload();

  await expect(editor(page)).toContainText("racecar");
});

test("persists the mirror toggle and word finder language across reloads", async ({
  page,
}) => {
  const mirrorToggle = page.locator('button:has-text("mirror")');
  await mirrorToggle.click();
  await expect(mirrorToggle).toHaveAttribute("aria-pressed", "true");

  await page.locator('button:has-text("find words")').click();
  await page
    .locator('select[aria-label="dictionary language"]')
    .selectOption("en");

  await page.reload();

  await expect(mirrorToggle).toHaveAttribute("aria-pressed", "true");
  await page.locator('button:has-text("find words")').click();
  await expect(
    page.locator('select[aria-label="dictionary language"]'),
  ).toHaveValue("en");
});

test("falls back to the sample palindrome when storage is corrupt", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("palindromaker:doc:v1", "not json");
  });

  await page.reload();

  await expect(editor(page)).toContainText("Eva, can I stab bats in a cave?");
});

test("falls back to the sample palindrome when storage holds unknown nodes", async ({
  page,
}) => {
  // parseable JSON the editor schema rejects would crash during render
  await page.addInitScript(() => {
    localStorage.setItem(
      "palindromaker:doc:v1",
      JSON.stringify({ type: "doc", content: [{ type: "bogus" }] }),
    );
  });

  await page.reload();

  await expect(editor(page)).toContainText("Eva, can I stab bats in a cave?");
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
  // for it to land; without that the two tabs race and whichever happens to
  // be edited first is the one asked about the conflict
  const saved = async (page: Page, text: string) => {
    await expect
      .poll(() =>
        page.evaluate(
          (key) => localStorage.getItem(key) ?? "",
          "palindromaker:doc:v1",
        ),
      )
      .toContain(text);
  };

  test("an untouched tab picks up what the other tab saved", async ({
    context,
  }) => {
    const first = await openTab(context);
    const second = await openTab(context);

    await replaceAll(first, "racecar");
    await saved(first, "racecar");

    // the second tab was never edited, so it has nothing to lose
    await expect(editor(second)).toContainText("racecar");
    await expect(conflictBar(second)).toHaveCount(0);
    await expect(greenBadge(second)).toBeVisible();
  });

  test("a tab with its own edits is asked which version to keep", async ({
    context,
  }) => {
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

    await conflictBar(second)
      .getByRole("button", { name: "Load that version" })
      .click();

    await expect(editor(second)).toContainText("racecar");
    await expect(conflictBar(second)).toHaveCount(0);
  });

  test("keeping this tab's version overwrites the other one", async ({
    context,
  }) => {
    const first = await openTab(context);
    const second = await openTab(context);

    await replaceAll(second, "level");
    await saved(second, "level");
    await expect(editor(first)).toContainText("level");

    await replaceAll(first, "racecar");
    await saved(first, "racecar");
    await expect(conflictBar(second)).toBeVisible();

    await conflictBar(second)
      .getByRole("button", { name: "Keep this one" })
      .click();

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

  await expect(editor(page)).toContainText("Eva, can I stab bats in a cave?");
  await expect(greenBadge(page)).toBeVisible();

  // editing still works, it just is not remembered
  await replaceAll(page, "hello world");
  await expect(redBadge(page)).toBeVisible();

  const mirrorToggle = page.locator('button:has-text("mirror")');
  await mirrorToggle.click();
  await expect(mirrorToggle).toHaveAttribute("aria-pressed", "true");
});

test("word finder searches the pt-br dictionary and shows mirrors", async ({
  page,
}) => {
  await page.locator('button:has-text("find words")').click();

  const searchInput = page.locator('input[aria-label="search words"]');
  await expect(searchInput).toBeVisible();

  // "abacate" is the first word starting with "abac"; its mirror differs
  await searchInput.fill("abac");
  const results = page.locator('[aria-label="results"] [role="listitem"]');
  await expect(results.first()).toContainText("abacate");

  const word =
    (await results.first().locator("span").first().textContent()) ?? "";
  await expect(results.first().locator("span").last()).toHaveText(
    [...word].reverse().join(""),
  );

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

test("word finder marks mirror pairs and palindromes", async ({ page }) => {
  await page.locator('button:has-text("find words")').click();

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

test("word finder virtualizes broad result sets", async ({ page }) => {
  await page.locator('button:has-text("find words")').click();

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
  const scrollHeight = await scroller.evaluate(
    (element) => element.scrollHeight,
  );
  expect(scrollHeight).toBeGreaterThan(1_000_000);

  // scrolling to the bottom swaps the rendered window, never grows it
  const firstRowBefore = await rows
    .first()
    .locator("span")
    .first()
    .textContent();
  await scroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(rows.first().locator("span").first()).not.toHaveText(
    firstRowBefore!,
  );
  expect(await rows.count()).toBeLessThan(100);
});
