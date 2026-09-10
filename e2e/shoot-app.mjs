// Screenshots the real app at mobile, tablet and desktop breakpoints.
// Run the dev server first, then: node e2e/shoot-app.mjs
import { chromium } from "./resolve-playwright.mjs";
import { mkdirSync } from "node:fs";

const breakpoints = [
  ["mobile", 390, 844],
  ["tablet", 834, 1194],
  ["desktop", 1440, 900],
];

mkdirSync(new URL("../screenshots", import.meta.url), { recursive: true });
const base = process.env.BASE_URL ?? "http://localhost:5173/";
const browser = await chromium.launch();
for (const [name, width, height] of breakpoints) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: new URL(`../screenshots/app-${name}.png`, import.meta.url).pathname,
  });
  // the closed state: no panel, the column re-centers full width
  await page.getByRole("button", { name: "Find words" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({
    path: new URL(`../screenshots/app-${name}-closed.png`, import.meta.url).pathname,
  });
  await context.close();
}
await browser.close();
console.log("done");
