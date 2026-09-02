import { expect, test, type Page } from "@playwright/test";

const editor = (page: Page) => page.locator('[contenteditable="true"]');

const greenBadge = (page: Page) => page.locator("span.bg-green-100");
const redBadge = (page: Page) => page.locator("span.bg-red-100");

// Slate 0.65 needs realistic keystroke pacing for its selection
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
