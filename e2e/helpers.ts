import { expect, type Locator, type Page } from "@playwright/test";

import { DOC_STORAGE_KEY } from "@/lib/persistence";

export const editor = (page: Page) => page.locator('[contenteditable="true"]');

// a /p#t= share link for the given text
export const shareUrl = (text: string) => `http://localhost:5173/p#t=${encodeURIComponent(text)}`;

// the reader is static semantic text with an aria-label + role=region
// (reader.tsx), the stable way to scope it and its decorations
export const reader = (page: Page) => page.getByRole("region", { name: "Shared palindrome" });

// ProseMirror needs realistic keystroke pacing for its selection sync to
// keep up with synthetic CDP input
export async function clearEditor(page: Page) {
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

export async function typeText(page: Page, text: string) {
  await page.keyboard.type(text, { delay: 30 });
}

export async function replaceAll(page: Page, text: string) {
  await clearEditor(page);
  await typeText(page, text);
}

// the debounced save is what cross-tab reactions (reload, another tab)
// are driven by; poll storage until this text has landed
export const saved = (page: Page, text: string) =>
  expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key) ?? "", DOC_STORAGE_KEY))
    .toContain(text);

export type { Locator };
