import { act, fireEvent, render, screen, within } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, test } from "vitest";

import SiteHeader from "@/components/site-header";
import { messages, setUiLanguage, UI_LANGUAGES } from "@/lib/i18n";
import type { UiLanguage } from "@/lib/i18n";
import { NAV_ENTRIES } from "@/lib/navigation";

// the header wrapped in a router, with stub pages standing in for the real
// routes: the header is the unit under test, and stubs keep TipTap out of
// the render. Awaits the routed page because the router resolves its
// initial location asynchronously and RouterProvider's first paint is empty.
const renderHeader = async (initial: string = "/") => {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <SiteHeader />
        <Outlet />
      </>
    ),
  });
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <p>home page</p>,
  });
  const aboutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/about",
    component: () => <p>about page</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, aboutRoute]),
    history: createMemoryHistory({ initialEntries: [initial] }),
  });
  render(<RouterProvider router={router} />);
  await screen.findByText(initial === "/about" ? "about page" : "home page");
};

// the panel the ☰ controls; its id is whatever aria-controls points at
const menuButton = () => screen.getByRole("button", { name: "Menu" });
const menuPanel = () => {
  const id = menuButton().getAttribute("aria-controls");
  if (!id) throw new Error("the menu button has no aria-controls");
  const panel = document.getElementById(id);
  if (!panel) throw new Error("no element matches the menu's aria-controls");
  return panel;
};

afterEach(() => {
  // the i18n store is module-global; leave "en" for the next test
  setUiLanguage("en");
});

describe("SiteHeader", () => {
  test("renders a link for every nav entry, labelled by the table", async () => {
    await renderHeader();

    for (const { path, labelKey } of NAV_ENTRIES) {
      const link = screen.getByRole("link", {
        name: messages.en[labelKey],
      });
      expect(link.getAttribute("href")).toBe(path);
    }
  });

  test("resolves the nav labels in every UI language", async () => {
    await renderHeader();

    for (const lang of UI_LANGUAGES) {
      act(() => setUiLanguage(lang as UiLanguage));
      for (const { labelKey } of NAV_ENTRIES) {
        expect(screen.getByRole("link", { name: messages[lang][labelKey] }));
      }
    }
  });

  test("marks the active page and keeps up after navigating", async () => {
    await renderHeader();

    const home = screen.getByRole("link", { name: "Home" });
    const about = screen.getByRole("link", { name: "About" });
    expect(home.getAttribute("aria-current")).toBe("page");
    expect(about.getAttribute("aria-current")).toBeNull();

    fireEvent.click(about);
    await screen.findByText("about page");

    expect(about.getAttribute("aria-current")).toBe("page");
    expect(home.getAttribute("aria-current")).toBeNull();
  });

  test("the ☰ toggles the menu panel", async () => {
    await renderHeader();

    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
    expect(menuPanel().hasAttribute("hidden")).toBe(true);

    fireEvent.click(menuButton());

    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
    expect(menuPanel().hasAttribute("hidden")).toBe(false);

    fireEvent.click(menuButton());

    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
    expect(menuPanel().hasAttribute("hidden")).toBe(true);
  });

  test("Escape closes the menu and refocuses the ☰ button", async () => {
    await renderHeader();
    fireEvent.click(menuButton());

    fireEvent.keyDown(document, { key: "Escape" });

    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(menuButton());
  });

  test("a click outside the header closes the menu", async () => {
    await renderHeader();
    fireEvent.click(menuButton());
    expect(menuButton().getAttribute("aria-expanded")).toBe("true");

    fireEvent.pointerDown(screen.getByText("home page"));

    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
  });

  test("navigating from the panel closes it", async () => {
    await renderHeader();
    fireEvent.click(menuButton());

    fireEvent.click(within(menuPanel()).getByRole("link", { name: "About" }));
    await screen.findByText("about page");

    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
    // re-queried: the menu remounts with the route, so this is the new
    // panel, closed
    expect(menuPanel().hasAttribute("hidden")).toBe(true);
  });

  test("clicking the page you are already on also closes the menu", async () => {
    await renderHeader();
    fireEvent.click(menuButton());

    const panel = menuPanel();
    fireEvent.click(within(panel).getByRole("link", { name: "Home" }));

    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
  });
});
