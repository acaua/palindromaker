import { describe, expect, test, vi } from "vite-plus/test";
import { Schema } from "@tiptap/pm/model";

import { clearShareFragment, resolveInitialContent } from "./editor-session";
import { DOC_STORAGE_KEY } from "./persistence";
import { sampleContent } from "./sample";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "text*" },
    text: { group: "inline" },
  },
});

class MemoryStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

const doc = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

describe("resolveInitialContent", () => {
  test("a shared #t= fragment wins over the stored doc", () => {
    const storage = new MemoryStorage();
    storage.setItem(DOC_STORAGE_KEY, JSON.stringify(doc("stored")));

    expect(
      resolveInitialContent({
        fragment: `#t=${encodeURIComponent("A b, b a")}`,
        storage,
        schema,
        uiLanguage: "en",
      }),
    ).toEqual(doc("A b, b a"));
  });

  test("the stored doc is used when there is no share", () => {
    const storage = new MemoryStorage();
    storage.setItem(DOC_STORAGE_KEY, JSON.stringify(doc("stored")));

    expect(resolveInitialContent({ fragment: "", storage, schema, uiLanguage: "en" })).toEqual(
      doc("stored"),
    );
  });

  test("the language's sample is used when storage holds nothing usable", () => {
    expect(
      resolveInitialContent({
        fragment: "",
        storage: new MemoryStorage(),
        schema,
        uiLanguage: "de",
      }),
    ).toBe(sampleContent("de"));
  });

  test("an unrenderable stored doc falls back to the sample", () => {
    const storage = new MemoryStorage();
    storage.setItem(DOC_STORAGE_KEY, '{"type":"doc","content":[{"type":"bogus"}]}');

    expect(resolveInitialContent({ fragment: "", storage, schema, uiLanguage: "fr" })).toBe(
      sampleContent("fr"),
    );
  });
});

describe("clearShareFragment", () => {
  test("drops the fragment and keeps path and query", () => {
    const history = { replaceState: vi.fn() };

    clearShareFragment({ hash: "#t=abc", pathname: "/p", search: "?x=1" }, history);

    expect(history.replaceState).toHaveBeenCalledWith(null, "", "/p?x=1");
  });

  test("does nothing without a fragment", () => {
    const history = { replaceState: vi.fn() };

    clearShareFragment({ hash: "", pathname: "/", search: "" }, history);

    expect(history.replaceState).not.toHaveBeenCalled();
  });
});
