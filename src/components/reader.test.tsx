import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import type { ReactElement } from "react";
import { afterEach, describe, expect, test } from "vite-plus/test";

import Reader from "@/components/reader";
import ReaderPage from "@/components/reader-page";

afterEach(cleanup);

afterEach(() => {
  window.location.hash = "";
});

describe("Reader", () => {
  // the reader's view is editable so ProseMirror's caret machinery runs;
  // read-only-ness lives in the claimed input events, not the attribute
  const viewer = (container: HTMLElement) => container.querySelector('[role="region"]');

  test("renders the shared text with center marks kept, mutably shielded", async () => {
    const view = await renderRouted(<Reader text="A b, b a" />);
    await screen.findByText("Copy text");
    const view1 = viewer(view.container);
    expect(view1?.textContent).toContain("A b, b a");
    // the shared content is always a palindrome when produced by the
    // share button, so both center halves stay marked
    expect(view.container.querySelectorAll("span.pm-center1.bg-blue-200")).toHaveLength(1);
    expect(view.container.querySelectorAll("span.pm-center2.bg-blue-200")).toHaveLength(1);

    // no input path may rewrite the shared text: the claimed
    // beforeinput/paste/drop cancel the browser's write before the DOM
    // moves (handleDOMEvents truthy return claims it from PM, too)
    const region = view1!;
    for (const type of [{ inputType: "insertText", data: "x" }, { inputType: "insertFromPaste" }]) {
      const event = new Event("beforeinput", { bubbles: true, cancelable: true });
      Object.assign(event, type);
      fireEvent(region, event);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(view1?.textContent).toContain("A b, b a");
  });

  test("the purple caret/mirror pair follows selection without editing", async () => {
    let editor: Editor | undefined;
    const view = await renderRouted(
      <Reader text="A b, b a" onReady={(instance) => (editor = instance)} />,
    );
    await screen.findByText("Copy text");
    if (!editor) throw new Error("the reader never got ready");
    // editable:true — the caret machinery needs it (PM gates keydown
    // handling on view.editable); mutations are cancelled in reader.tsx
    expect(editor.isEditable).toBe(true);
    const view1 = viewer(view.container);
    expect(view1).not.toBeNull();

    // the state-level quarantine: a doc-changing transaction is dropped
    // outright by the ReadOnlyContent extension, whatever internal path
    // produced it — the shared state (and thus Copy, reload) stays
    // clean; selection-only transactions pass and caret navigation works
    const { doc } = editor.view.state;
    editor.view.dispatch(editor.view.state.tr.insertText("X", 3));
    expect(editor.view.state.doc.eq(doc)).toBe(true);
    // keydown-driven edits (Backspace/Delete) never reach a cancelable
    // beforeinput: the filter is the layer that stops them
    editor.view.dispatch(editor.view.state.tr.delete(3, 4));
    expect(editor.view.state.doc.eq(doc)).toBe(true);
    editor.view.dispatch(
      editor.view.state.tr
        .setSelection(TextSelection.create(editor.view.state.doc, 3))
        .scrollIntoView(),
    );
    expect(editor.view.state.selection.head).toBe(3);

    // the caret on the first "b" (index 2) marks itself and its mirror,
    // the "b" at index 5 — scoped to the view, apart from the legend
    // swatch that shares the class
    expect(view1?.querySelectorAll("span.bg-purple-200")).toHaveLength(1);
    expect(view1?.querySelectorAll("span.bg-purple-400")).toHaveLength(1);
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

describe("ReaderPage", () => {
  test("renders the shared palindrome from the hash", async () => {
    window.location.hash = "#t=A%20b%2C%20b%20a";
    await renderRouted(<ReaderPage />);

    expect(await screen.findByText("Copy text")).not.toBeNull();
    const viewer = document.querySelector('[role="region"]');
    expect(viewer?.textContent).toContain("A b, b a");
  });

  test("shows the empty card for a missing, empty or broken hash", async () => {
    const badHashes = [undefined, "#t=", "#t=%80", "#lang=pt"];
    for (const bad of badHashes) {
      if (bad !== undefined) window.location.hash = bad;
      await renderRouted(<ReaderPage />);

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
async function renderRouted(ui: ReactElement) {
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
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, pRoute]),
    history: createMemoryHistory({ initialEntries: ["/p"] }),
  });
  const view = render(<RouterProvider router={router} />);
  // RouterProvider resolves its initial location asynchronously and its
  // first paint is empty; callers await their own routed signal
  await Promise.resolve();
  return view;
}
