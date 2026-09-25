import { afterEach, describe, expect, test, vi } from "vite-plus/test";

import { resetPageView } from "@/lib/page-focus";

const scrollTo = () => vi.spyOn(window, "scrollTo").mockImplementation(() => {});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("resetPageView", () => {
  test("scrolls to the top and focuses the page heading", () => {
    document.body.innerHTML = `<main><h1 tabindex="-1" id="heading">Title</h1></main>`;
    const spy = scrollTo();

    resetPageView();

    expect(spy).toHaveBeenCalledWith(0, 0);
    expect(document.activeElement?.id).toBe("heading");
  });

  test("leaves focus alone while a contenteditable element owns it", () => {
    document.body.innerHTML = `<main><h1 tabindex="-1" id="heading">Title</h1></main>`;
    const editor = document.createElement("div");
    editor.tabIndex = -1;
    Object.defineProperty(editor, "isContentEditable", { value: true });
    document.body.append(editor);
    editor.focus();
    const spy = scrollTo();

    resetPageView();

    expect(spy).toHaveBeenCalledWith(0, 0);
    expect(document.activeElement).toBe(editor);
  });
});
