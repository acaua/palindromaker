import { expect, test, type Page } from "@playwright/test";

const editor = (page: Page) => page.locator('[contenteditable="true"]');

const greenBadge = (page: Page) => page.locator("span.bg-green-100");
const redBadge = (page: Page) => page.locator("span.bg-red-100");

// ProseMirror needs realistic keystroke pacing for its selection
// sync to keep up with synthetic CDP input
async function clearEditor(page: Page) {
  const editable = editor(page);
  await editable.click();
  await page.keyboard.press("End");
  await page.waitForTimeout(100);
  for (let i = 0; i < 40; i++) {
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
  await expect(greenBadge(page)).toContainText("palindrome");
  await expect(redBadge(page)).toHaveCount(0);
});

test("shows a red badge for non-palindrome text", async ({ page }) => {
  await replaceAll(page, "hello world");

  await expect(redBadge(page)).toContainText("palindrome");
  await expect(greenBadge(page)).toHaveCount(0);
});

test("highlights the center characters of a palindrome", async ({ page }) => {
  await replaceAll(page, "A b, b a");

  await expect(greenBadge(page)).toBeVisible();
  await expect(page.locator("span.bg-blue-200")).toHaveCount(2);
  await expect(page.locator("span.bg-red-300")).toHaveCount(0);
});

test("shows the gap highlight when text is not a palindrome", async ({
  page,
}) => {
  await replaceAll(page, "abc a");

  await expect(redBadge(page)).toBeVisible();
  await expect(page.locator("span.bg-red-300")).toBeVisible();
});

test("highlights the mirrored character of the caret position", async ({
  page,
}) => {
  await replaceAll(page, "A b, b a");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");

  // caret is on the first "b" (index 2), mirrored by the "b" at index 5
  await expect(page.locator("span.bg-purple-200")).toBeVisible();
  await expect(page.locator("span.bg-purple-400")).toBeVisible();
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

test("word finder virtualizes broad result sets", async ({ page }) => {
  await page.locator('button:has-text("find words")').click();

  const searchInput = page.locator('input[aria-label="search words"]');
  // ~37k words start with "a" in the pt-br dictionary
  await searchInput.fill("a");

  const scroller = page.locator('div[aria-label="results"]');
  const rows = page.locator('[aria-label="results"] [role="listitem"]');
  await expect(rows.first()).toContainText("a");

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
