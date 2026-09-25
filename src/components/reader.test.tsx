import { cleanup, fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { createRootRoute, createRoute, Outlet } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import Reader from "@/components/reader";
import ReaderPage from "@/components/reader-page";
import { renderWithRouter } from "@/test/render-with-router";

afterEach(cleanup);

afterEach(() => {
  window.location.hash = "";
  vi.restoreAllMocks();
});

describe("Reader", () => {
  const region = (container: HTMLElement) => container.querySelector('[role="region"]');
  const purplePivot = (container: HTMLElement) =>
    region(container)?.querySelectorAll(".bg-purple-200") ?? [];
  const purpleMirror = (container: HTMLElement) =>
    region(container)?.querySelectorAll(".bg-purple-400") ?? [];

  test("renders the shared text as static semantic text with center marks", async () => {
    const view = await renderRouted(<Reader text="A b, b a" />);
    await screen.findByText("Copy text");

    // no editable surface, no textbox: read-only is structural now
    expect(view.container.querySelector("[contenteditable]")).toBeNull();
    expect(region(view.container)?.getAttribute("contenteditable")).toBeNull();
    expect(region(view.container)?.textContent).toContain("A b, b a");
    // the shared content is always a palindrome when produced by the share
    // button, so both center halves stay marked
    expect(view.container.querySelectorAll("span.pm-center1.bg-blue-200")).toHaveLength(1);
    expect(view.container.querySelectorAll("span.pm-center2.bg-blue-200")).toHaveLength(1);
    expect(region(view.container)?.querySelectorAll("p")).toHaveLength(1);
  });

  test("states the palindrome verdict", async () => {
    await renderRouted(<Reader text="A b, b a" />);
    await screen.findByText("Copy text");
    expect(screen.getByRole("status").textContent).toBe("Palindrome");
    cleanup();

    await renderRouted(<Reader text="hello world" />);
    await screen.findByText("Copy text");
    expect(screen.getByRole("status").textContent).toBe("Not a palindrome");
  });

  test("tapping a letter lights its mirror pair", async () => {
    const view = await renderRouted(<Reader text="A b, b a" />);
    await screen.findByText("Copy text");

    const letter = view.container.querySelector<HTMLElement>('[data-step="0"]');
    expect(letter).not.toBeNull();
    fireEvent.click(letter!);

    expect(purplePivot(view.container)).toHaveLength(1);
    expect(purpleMirror(view.container)).toHaveLength(1);
  });

  test("does not pivot while text is selected", async () => {
    const view = await renderRouted(<Reader text="A b, b a" />);
    await screen.findByText("Copy text");
    vi.spyOn(window, "getSelection").mockReturnValue({ isCollapsed: false } as Selection);

    fireEvent.click(view.container.querySelector<HTMLElement>('[data-step="0"]')!);
    // the swipe accelerant shares the guard: a selection is never stepped
    fireEvent.touchStart(view.container.querySelector('[role="region"]')!);
    fireEvent.touchEnd(view.container.querySelector('[role="region"]')!);

    expect(purplePivot(view.container)).toHaveLength(0);
  });

  test("the stepper steps, centres and stops at the boundaries", async () => {
    await renderRouted(<Reader text="A b, b a" />);
    await screen.findByText("Copy text");
    const label = () => document.querySelector('[aria-live="polite"]')!.textContent;

    const next = screen.getByRole("button", { name: "Next pair" });
    const prev = screen.getByRole("button", { name: "Previous pair" });
    // nothing is selected yet
    expect(label()).toBe("");

    fireEvent.click(next);
    expect(label()).toBe("Pair 1 of 2");
    fireEvent.click(next);
    // the innermost even pair is the centre, and the end is a boundary
    expect(label()).toBe("Center pair");
    expect(next.hasAttribute("disabled")).toBe(true);

    fireEvent.click(prev);
    expect(label()).toBe("Pair 1 of 2");
    expect(prev.hasAttribute("disabled")).toBe(true);
  });

  test("the stepper buttons work even while text is selected", async () => {
    // the selection guard belongs to the tap and the swipe; the buttons are
    // the accessible path and must keep working with a selection active
    await renderRouted(<Reader text="A b, b a" />);
    await screen.findByText("Copy text");
    vi.spyOn(window, "getSelection").mockReturnValue({ isCollapsed: false } as Selection);
    const label = () => document.querySelector('[aria-live="polite"]')!.textContent;

    fireEvent.click(screen.getByRole("button", { name: "Next pair" }));
    expect(label()).toBe("Pair 1 of 2");
  });

  test("the pair label counts pairs, excluding a lone center", async () => {
    // "abcba" is two pairs plus a lone center: stepping through the pairs
    // must say "Pair 1 of 2" / "Pair 2 of 2", never "of 3"
    await renderRouted(<Reader text="abcba" />);
    await screen.findByText("Copy text");
    const label = () => document.querySelector('[aria-live="polite"]')!.textContent;

    const next = screen.getByRole("button", { name: "Next pair" });
    fireEvent.click(next);
    expect(label()).toBe("Pair 1 of 2");
    fireEvent.click(next);
    expect(label()).toBe("Pair 2 of 2");
    fireEvent.click(next);
    expect(label()).toBe("Center");
  });

  test("offers no stepper when there is no pair to step", async () => {
    // a non-palindrome has no steps; a single-letter palindrome has only a
    // lone-center step, which is not a pair either
    for (const text of ["hello world", "a", "!!!"]) {
      const view = await renderRouted(<Reader text={text} />);
      await screen.findByText("Copy text");

      expect(screen.queryByRole("button", { name: "Next pair" })).toBeNull();
      expect(view.container.querySelector('[aria-live="polite"]')).toBeNull();
      cleanup();
    }
  });

  test("does not focus the reader on load", async () => {
    const view = await renderRouted(<Reader text="A b, b a" />);
    await screen.findByText("Copy text");

    expect(document.activeElement).not.toBe(region(view.container));
  });

  test("resets the step and announces the heading when the text changes", async () => {
    const view = await renderRouted(<ChangingReader />);
    await screen.findByText("Copy text");
    fireEvent.click(view.container.querySelector<HTMLElement>('[data-step="0"]')!);
    expect(purplePivot(view.container)).toHaveLength(1);

    fireEvent.click(screen.getByText("swap"));

    expect(purplePivot(view.container)).toHaveLength(0);
    expect(document.activeElement?.tagName).toBe("H1");
  });

  test("offers Copy text and Edit this", async () => {
    await renderRouted(<Reader text="A b, b a" />);
    await screen.findByText("Copy text");

    const copy = screen.getByText("Copy text");
    expect(copy.closest("button")?.getAttribute("title")).toBe("Copy text");
    const edit = screen.getByText("Edit this");
    expect(edit.getAttribute("href")).toBe("/#t=A%20b%2C%20b%20a");
  });
});

function ChangingReader() {
  const [text, setText] = useState("A b, b a");
  return (
    <>
      <button type="button" onClick={() => setText("xyx")}>
        swap
      </button>
      <Reader text={text} />
    </>
  );
}

describe("ReaderPage", () => {
  test("renders the shared palindrome from the hash", async () => {
    await renderRouted(<ReaderPage />, "/p#t=A%20b%2C%20b%20a");

    expect(await screen.findByText("Copy text")).not.toBeNull();
    const reader = document.querySelector('[role="region"]');
    expect(reader?.textContent).toContain("A b, b a");
  });

  test("shows the empty card for a missing, empty or broken hash", async () => {
    const badEntries = ["/p", "/p#t=", "/p#t=%80", "/p#lang=pt"];
    for (const entry of badEntries) {
      await renderRouted(<ReaderPage />, entry);

      expect(await screen.findByText("Nothing shared here")).not.toBeNull();
      expect(screen.getByText(/doesn.t point to a palindrome/)).not.toBeNull();
      expect(screen.getByText("Make your own palindrome").getAttribute("href")).toBe("/");
      cleanup();
    }
  });

  test("the empty card links back home", async () => {
    await renderRouted(<ReaderPage />);

    fireEvent.click(await screen.findByText("Make your own palindrome"));
    await screen.findByText("home page");
  });
});

// Reader renders a TanStack Link, so it needs a router context like the
// page does: a memory router with a stub home around the unit under test
async function renderRouted(ui: ReactElement, entry = "/p") {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <p>home page</p>,
  });
  const pRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/p",
    component: () => ui,
  });
  const view = renderWithRouter({
    routeTree: rootRoute.addChildren([homeRoute, pRoute]),
    initialEntry: entry,
  });
  // RouterProvider resolves its initial location asynchronously and its
  // first paint is empty; callers await their own routed signal
  await Promise.resolve();
  return view;
}
