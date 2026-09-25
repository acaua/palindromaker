import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { clearEditor, editor, reader, replaceAll, saved, shareUrl, typeText } from "./helpers";
import { SAMPLE_CONTENT } from "@/lib/sample";

// clipboard access has to be granted for the suite to observe what the
// app's clipboard writes actually land
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const shareButton = (page: Page) => page.getByRole("button", { name: "Share" });

// the status line is plain text (role + color class), scoped apart from
// the legend swatches that share the color
const greenStatus = (page: Page) => page.locator('span[role="status"].text-green-700');

// the decorations live inside the reader; scoping keeps them apart from
// the legend, whose swatches reuse the same classes
const readerDecoration = (page: Page, className: string) =>
  reader(page).locator(`span.${className}`);

// the clipboard read races the copy; poll until it agrees
const clipboard = (page: Page) =>
  expect.poll(() => page.evaluate(() => navigator.clipboard.readText()));

test("share copies a /p link for the current palindrome", async ({ page }) => {
  await page.goto("/");

  await shareButton(page).click();
  await page.getByRole("button", { name: "Copy link" }).click();

  // the feedback is a label swap that renames the trigger: locate by the
  // copied name (locating by the resting name would re-resolve only once
  // the label has flipped back, and never see the flip)
  const copied = page.getByRole("button", { name: /Copied!/i });
  await expect(copied).toBeVisible();
  await clipboard(page).toBe(shareUrl(SAMPLE_CONTENT));
  // the feedback is transient
  await expect(copied).toBeHidden({ timeout: 4000 });
});

test("the share menu passes the accessibility audit", async ({ page }) => {
  await page.goto("/");
  await shareButton(page).click();
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
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

test("the shared link opens the protective reader", async ({ page }) => {
  await page.goto(shareUrl(SAMPLE_CONTENT));

  await expect(reader(page)).toContainText(SAMPLE_CONTENT);
  // no editable surface at all: read-only is structural now, so there is no
  // mutation path left to shield
  await expect(page.locator("[contenteditable]")).toHaveCount(0);
  // no editor chrome: the status bar stays home
  await expect(shareButton(page)).toHaveCount(0);
  await expect(page.getByText("Find words")).toHaveCount(0);
  // center marks survive the round-trip
  await expect(readerDecoration(page, "bg-blue-200")).toHaveCount(2);
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

  const view = reader(page);
  await expect(view.locator("p")).toHaveCount(2);
  // the junction pair is the center
  await expect(readerDecoration(page, "bg-blue-200")).toHaveCount(2);
});

test("the reader passes the accessibility audit", async ({ page }) => {
  await page.goto(shareUrl(SAMPLE_CONTENT));

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
