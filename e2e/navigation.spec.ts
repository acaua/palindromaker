import { expect, test } from "@playwright/test";

// the header is chrome shared by both routes: its links must move between
// them and back, at desktop and through the mobile menu
test("the header navigates to About and back home", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "About" }).click();
  await expect(
    page.getByRole("heading", { name: "About Palindromaker" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/about$/);

  await page.getByRole("link", { name: "Home" }).click();
  await expect(
    page.getByRole("textbox", { name: "Palindrome editor" }),
  ).toBeVisible();
});

// a direct visit to a routed path must survive the reload — the static
// host serves the SPA for every path
test("opens /about directly", async ({ page }) => {
  await page.goto("/about");

  await expect(
    page.getByRole("heading", { name: "About Palindromaker" }),
  ).toBeVisible();
});

test("the mobile menu navigates and closes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await page.goto("/");

  const menu = page.getByRole("button", { name: "Menu" });
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");

  // the desktop row is display:none at this width, so the panel's link is
  // the one "About" in the accessibility tree
  await page.getByRole("link", { name: "About" }).click();

  await expect(
    page.getByRole("heading", { name: "About Palindromaker" }),
  ).toBeVisible();
  // navigation closes the panel behind the user
  await expect(menu).toHaveAttribute("aria-expanded", "false");

  // Escape closes a re-opened menu and returns focus to the button
  await menu.click();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeFocused();
});
