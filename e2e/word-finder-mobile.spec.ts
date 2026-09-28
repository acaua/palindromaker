import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow } from "./helpers";

// A short phone on purpose: the regression this guards is that the phone
// finder used to be a fixed bottom sheet whose result list collapsed to 0px.
// The `mobile` project's Pixel 7 is tall enough to have shown a row anyway,
// so pinning the viewport is what keeps this test honest.
test.use({ viewport: { width: 375, height: 667 } });

const panel = (page: Page) => page.locator("#word-finder-panel");
const searchInput = (page: Page) => page.locator('input[aria-label="search words"]');
const results = (page: Page) => page.locator('[aria-label="results"]');
const rows = (page: Page) => results(page).locator('[role="listitem"]');
// the editor card (the rounded wrapper around the ProseMirror surface)
const editorCard = (page: Page) => page.locator('div.rounded-xl:has(div[contenteditable="true"])');

test("the finder sits below the editor and shows its results on a phone", async ({ page }) => {
  await page.goto("/");

  // the panel is open by default, and on a phone it is an in-flow block
  await expect(panel(page)).toBeVisible();

  // it must not be an overlay: a fixed sheet would compute to `position:
  // fixed`; the in-flow panel is statically positioned
  const position = await panel(page).evaluate((el) => getComputedStyle(el).position);
  expect(position).not.toBe("fixed");

  // and at the top of the page it sits below the editor card, whose sample
  // content makes it end well past the 48% a bottom sheet would start at.
  // (The list-height check further down is the independent signal.)
  await page.evaluate(() => window.scrollTo(0, 0));
  const cardBox = await editorCard(page).boundingBox();
  const panelBox = await panel(page).boundingBox();
  expect(cardBox).not.toBeNull();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.y).toBeGreaterThanOrEqual(cardBox!.y + cardBox!.height - 1);

  // a broad search fills the list (the bug left it 0px tall)
  await searchInput(page).fill("abac");
  await expect(rows(page).first()).toContainText("abacate");

  // room for at least two 44px rows before it scrolls internally
  const listBox = await results(page).boundingBox();
  expect(listBox!.height).toBeGreaterThan(88);

  // scroll down to the finder: the first row and the marker legend are there
  await page.evaluate(() => document.querySelector("#word-finder-panel")?.scrollIntoView());
  await expect(rows(page).first()).toBeInViewport();
  await expect(page.locator('footer[aria-label="word finder legend"]')).toBeVisible();

  // the in-flow panel must not introduce horizontal overflow
  await expectNoHorizontalOverflow(page);
});
