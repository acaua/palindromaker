import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { URI, stubBluesky } from "./bluesky-stubs";
import { reader, shareUrl } from "./helpers";
import { SAMPLE_CONTENT } from "@/lib/sample";

// clipboard access has to be granted for the exact-copy test to observe what
// the app writes
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

// the mobile project is scoped to this spec (playwright.config.ts)
const isMobile = () => test.info().project.name === "mobile";

const open = async (page: Page, text: string) => {
  await page.goto(shareUrl(text));
  await reader(page).waitFor();
};

test("the reader is static text: no editable surface and no editor chrome", async ({ page }) => {
  await open(page, SAMPLE_CONTENT);

  await expect(reader(page)).toContainText(SAMPLE_CONTENT);
  await expect(page.locator("[contenteditable]")).toHaveCount(0);
  // the editor's controls stay home
  await expect(page.getByRole("button", { name: "Share" })).toHaveCount(0);
  await expect(page.getByText("Find words")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "A shared palindrome" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Palindrome");
});

test("the stepper walks the pairs from the ends to the center", async ({ page }) => {
  await open(page, "abba");
  const next = page.getByRole("button", { name: "Next pair" });
  const prev = page.getByRole("button", { name: "Previous pair" });

  await next.click();
  await expect(page.getByText("Pair 1 of 2")).toBeVisible();
  await expect(reader(page).locator(".bg-purple-200")).toHaveCount(1);

  await next.click();
  // the innermost even pair is the centre and the end is a boundary
  await expect(page.getByText("Center pair")).toBeVisible();
  await expect(next).toBeDisabled();

  await prev.click();
  await expect(page.getByText("Pair 1 of 2")).toBeVisible();
});

test("the stepper works while text is selected; the swipe does not", async ({ page }) => {
  test.skip(isMobile(), "keyboard/mouse selection is a desktop gesture");
  await open(page, SAMPLE_CONTENT);

  // select the whole line: the buttons must still step, the swipe must not
  await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('[role="region"] p')!);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });

  await page.getByRole("button", { name: "Next pair" }).click();
  await expect(page.getByText("Pair 1 of")).toBeVisible();
});

test("tapping a letter lights its mirror pair", async ({ page }) => {
  await open(page, "abba");
  const letter = reader(page).locator('[data-step="0"]').first();

  if (isMobile()) await letter.tap();
  else await letter.click();

  await expect(reader(page).locator(".bg-purple-200")).toHaveCount(1);
  await expect(reader(page).locator(".bg-purple-400")).toHaveCount(1);
});

test("native drag-selection still works and does not trigger a pivot", async ({ page }) => {
  test.skip(isMobile(), "mouse drag is a desktop gesture");
  await open(page, SAMPLE_CONTENT);

  // start from an active pair, so a selection stealing the pivot would show
  await reader(page).locator('[data-step="0"]').first().click();
  await expect(reader(page).locator(".bg-purple-200")).toHaveCount(1);

  const box = (await reader(page).locator("p").first().boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 160, y, { steps: 8 });
  await page.mouse.up();

  const selected = await page.evaluate(() => window.getSelection()?.toString() ?? "");
  expect(selected.length).toBeGreaterThan(0);
  // the pair the user picked is still the active one
  await expect(reader(page).locator(".bg-purple-200")).toHaveCount(1);
});

test("copy puts the exact raw text, line breaks included", async ({ page }) => {
  await open(page, `${SAMPLE_CONTENT}\n${SAMPLE_CONTENT}`);

  await page.getByRole("button", { name: "Copy text" }).click();

  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`${SAMPLE_CONTENT}\n${SAMPLE_CONTENT}`);
});

test("a phone has no horizontal overflow", async ({ page }) => {
  test.skip(!isMobile(), "viewport check is for the mobile project");
  await open(page, `${SAMPLE_CONTENT}\n${SAMPLE_CONTENT}`);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("primary actions are at least 44px on a phone", async ({ page }) => {
  test.skip(!isMobile(), "touch target check is for the mobile project");
  await open(page, SAMPLE_CONTENT);

  for (const name of ["Copy text", "Previous pair", "Next pair"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  const edit = await page.getByRole("link", { name: "Edit this" }).boundingBox();
  expect(edit?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test("the post reader's actions are at least 44px on a phone", async ({ page }) => {
  test.skip(!isMobile(), "touch target check is for the mobile project");
  await stubBluesky(page);
  await page.goto(`/p#b=${encodeURIComponent(URI)}`);

  await expect(reader(page)).toContainText("A man, a plan, a canal: Panama");
  for (const name of ["Copy text", "Copy link"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  const view = await page.getByRole("link", { name: "View on Bluesky" }).boundingBox();
  expect(view?.height ?? 0).toBeGreaterThanOrEqual(44);
});

// dispatch a horizontal swipe on the reader surface: a right-to-left drag
// steps forward. Used by the swipe test and the selection-guard test.
const swipe = (page: Page) =>
  page.evaluate(() => {
    const surface = document.querySelector('[role="region"]')!;
    const at = (x: number) =>
      new Touch({ identifier: 1, target: surface, clientX: x, clientY: 60 });
    const dispatch = (type: string, touches: Touch[], changed: Touch[]) =>
      surface.dispatchEvent(
        new TouchEvent(type, {
          touches,
          targetTouches: touches,
          changedTouches: changed,
          bubbles: true,
          cancelable: true,
        }),
      );
    dispatch("touchstart", [at(220)], [at(220)]);
    dispatch("touchend", [], [at(140)]);
  });

test("a swipe steps the mirror pair", async ({ page }) => {
  test.skip(!isMobile(), "touch swipe is for the mobile project");
  await open(page, "abba");

  await swipe(page);

  await expect(reader(page).locator(".bg-purple-200")).toHaveCount(1);
});

test("a swipe is ignored while text is selected", async ({ page }) => {
  test.skip(!isMobile(), "touch selection is for the mobile project");
  await open(page, SAMPLE_CONTENT);

  // select the whole line, then swipe: the selection must survive untouched
  await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('[role="region"] p')!);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await swipe(page);

  await expect(reader(page).locator(".bg-purple-200")).toHaveCount(0);
  await expect(reader(page).locator(".bg-purple-400")).toHaveCount(0);
});

test("the mobile reader passes the accessibility audit", async ({ page }) => {
  test.skip(!isMobile(), "one mobile audit");
  await open(page, SAMPLE_CONTENT);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
