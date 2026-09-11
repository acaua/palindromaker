import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { clearEditor, editor, replaceAll, saved, typeText } from "./helpers";
import { SAMPLE_CONTENT } from "@/lib/sample";

// clipboard access has to be granted for the suite to observe what the
// app's clipboard writes actually land
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const shareUrl = (text: string) => `http://localhost:5173/p#t=${encodeURIComponent(text)}`;

// the viewer carries an aria-label + role=region (contenteditable is
// deliberately true so PM's caret machinery runs — reader.tsx), so the
// role is also the stable way to scope its decorations
const viewer = (page: Page) => page.getByRole("region", { name: "Shared palindrome" });

const shareButton = (page: Page) => page.getByRole("button", { name: "Share" });

// the status line is plain text (role + color class), scoped apart from
// the legend swatches that share the color
const greenStatus = (page: Page) => page.locator('span[role="status"].text-green-700');

// the decorations live inside the viewer; scoping keeps them apart from
// the legend, whose swatches reuse the same classes
const readerDecoration = (page: Page, className: string) =>
  viewer(page).locator(`span.${className}`);

// the clipboard read races the copy; poll until it agrees
const clipboard = (page: Page) =>
  expect.poll(() => page.evaluate(() => navigator.clipboard.readText()));

test("share copies a /p link for the current palindrome", async ({ page }) => {
  await page.goto("/");

  await shareButton(page).click();

  // the feedback is a label swap that renames the button: locate by the
  // copied name (locating by the resting name would re-resolve only once
  // the label has flipped back, and never see the flip)
  const copied = page.getByRole("button", { name: /Copied!/i });
  await expect(copied).toBeVisible();
  await clipboard(page).toBe(shareUrl(SAMPLE_CONTENT));
  // the feedback is transient
  await expect(copied).toBeHidden({ timeout: 4000 });
});

test("share is disabled while the text is not a palindrome", async ({ page }) => {
  await page.goto("/");
  await replaceAll(page, "hello world");

  await expect(shareButton(page)).toBeDisabled();
  await expect(shareButton(page)).toHaveAttribute("title", /Finish the palindrome/);
});

test("share is disabled for the empty editor despite its vacuous palindrome", async ({ page }) => {
  await page.goto("/");
  await clearEditor(page);

  await expect(shareButton(page)).toBeDisabled();
});

test("the shared link opens the protective viewer", async ({ page }) => {
  await page.goto(shareUrl(SAMPLE_CONTENT));

  await expect(viewer(page)).toContainText(SAMPLE_CONTENT);
  // the viewer's surface is editable so PM's caret machinery runs, but
  // reader.tsx claims every mutation event and editor-schema.ts drops
  // surviving doc-changing transactions — typing and a keydown edit
  // (Backspace) must both leave the text alone
  await viewer(page).pressSequentially("x");
  await expect(viewer(page)).toContainText(SAMPLE_CONTENT);
  await viewer(page).press("Backspace");
  await expect(viewer(page)).toContainText(SAMPLE_CONTENT);
  // no editor chrome: the status bar stays home
  await expect(shareButton(page)).toHaveCount(0);
  await expect(page.getByText("Find words")).toHaveCount(0);
  // center marks survive the round-trip
  await expect(readerDecoration(page, "bg-blue-200")).toHaveCount(2);
});

test("the viewer's purple decorations follow the selection", async ({ page }) => {
  await page.goto(shareUrl(SAMPLE_CONTENT));

  // clicking the bounding box's center can land past the line's end, and
  // clicks inside a decoration span are swallowed by the observer's
  // ignore-selection logic; a small offset onto the first (undecorated)
  // glyph always lands on a mirrored letter
  await viewer(page)
    .locator("p")
    .first()
    .click({ position: { x: 2, y: 14 } });

  await expect(readerDecoration(page, "bg-purple-200")).toBeVisible();
  await expect(readerDecoration(page, "bg-purple-400")).toBeVisible();
});

test("arrow keys move the caret like an editable editor", async ({ page }) => {
  await page.goto(shareUrl(SAMPLE_CONTENT));
  await viewer(page)
    .locator("p")
    .first()
    .click({ position: { x: 2, y: 14 } });

  const caret = () => page.evaluate(() => window.getSelection()!.getRangeAt(0).startOffset);

  const start = await caret();
  await page.keyboard.press("ArrowRight");
  expect(await caret()).toBeGreaterThan(start);
  const afterRight = await caret();
  await page.keyboard.press("ArrowLeft");
  expect(await caret()).toBeLessThan(afterRight);
});

test("vertical arrows cross the shared paragraphs", async ({ page }) => {
  await page.goto(shareUrl(`${SAMPLE_CONTENT}\n${SAMPLE_CONTENT}`));
  await viewer(page)
    .locator("p")
    .first()
    .click({ position: { x: 2, y: 14 } });

  // which paragraph holds the caret after the movement
  const paragraphOfCaret = page.evaluate.bind(page, () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return -1;
    const range = selection.getRangeAt(0);
    const paragraphs = [...document.querySelectorAll('main [role="region"] p')];
    for (const [index, p] of paragraphs.entries()) {
      if (p.contains(range.startContainer)) return index;
    }
    return -1;
  });

  expect(await paragraphOfCaret()).toBe(0);
  await page.keyboard.press("ArrowDown");
  expect(await paragraphOfCaret()).toBe(1);
  await page.keyboard.press("ArrowUp");
  expect(await paragraphOfCaret()).toBe(0);
});

test("copy text puts the plain text on the clipboard", async ({ page }) => {
  await page.goto(shareUrl(SAMPLE_CONTENT));

  await page.getByRole("button", { name: "Copy text" }).click();

  await clipboard(page).toBe(SAMPLE_CONTENT);
});

test("edit this carries the fragment into the editor and saves the first edit", async ({
  page,
}) => {
  await page.goto(shareUrl(SAMPLE_CONTENT));
  await page.getByRole("link", { name: "Edit this" }).click();

  // the same fragment rides along into the home editor, and the hash is
  // consumed right after reading — reloads fall back to storage
  await expect(editor(page)).toContainText(SAMPLE_CONTENT);
  await expect(page).toHaveURL(/\/$/);
  expect(page.url()).not.toContain("t=");
  await expect(greenStatus(page)).toBeVisible();

  // editing the shared text saves it over the local doc (accepted
  // trade-off of the silent replace)
  await typeText(page, "!");
  await saved(page, "!");
  await page.reload();
  await expect(editor(page)).toContainText(SAMPLE_CONTENT);
});

test("a broken link gets the friendly empty card and a way back", async ({ page }) => {
  await page.goto("/p");

  await expect(page.getByRole("heading", { name: "Nothing shared here" })).toBeVisible();
  await page.getByRole("link", { name: "Make your own palindrome" }).click();
  await expect(editor(page)).toBeVisible();

  // malformed or over-long fragments count as broken too
  for (const url of ["http://localhost:5173/p#t=%80", shareUrl("a".repeat(2001))]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: "Nothing shared here" })).toBeVisible();
  }
});

test("multi-paragraph palindromes round-trip through the fragment", async ({ page }) => {
  // two copies of the same palindrome join into one; empty paragraphs on
  // the edges are the accepted round-trip loss and none are involved here
  await page.goto(shareUrl(`${SAMPLE_CONTENT}\n${SAMPLE_CONTENT}`));

  const view = viewer(page);
  await expect(view.locator("p")).toHaveCount(2);
  // the junction pair is the center
  await expect(readerDecoration(page, "bg-blue-200")).toHaveCount(2);
});

test("the viewer passes the accessibility audit", async ({ page }) => {
  await page.goto(shareUrl(SAMPLE_CONTENT));

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
