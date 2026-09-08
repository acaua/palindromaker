// Screenshots the layout explorations in ../layouts.html at three
// breakpoints. Run the dev server first, then: node e2e/shoot-layouts.mjs
import { chromium } from "./resolve-playwright.mjs";
import { mkdirSync } from "node:fs";

const all = [
  "zen-bar-title-mid",
  "zen-bar-title-mid-rule",
  "zen-bar-title-mid-inline",
  "zen-bar-title-mid-tight",
  "zen-bar-title-mid-airy",
];
const layouts = process.argv.slice(2).filter((a) => all.includes(a));
if (layouts.length === 0) layouts.push(...all);
const breakpoints = [
  ["mobile", 390, 844],
  ["tablet", 834, 1194],
  ["desktop", 1440, 900],
];

mkdirSync(new URL("../screenshots", import.meta.url), { recursive: true });
const base = process.env.BASE_URL ?? "http://localhost:5173/layouts.html";
const browser = await chromium.launch();
for (const [name, width, height] of breakpoints) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  for (const layout of layouts) {
    await page.goto(`${base}#${layout}`, { waitUntil: "networkidle" });
    await page.screenshot({
      path: new URL(`../screenshots/${layout}-${name}.png`, import.meta.url)
        .pathname,
    });
  }
  await context.close();
}
await browser.close();
console.log("done");
