import { describe, expect, test, vi } from "vite-plus/test";

import { testSchema } from "@/test/schema";
import { MemoryStorage } from "@/test/storages";
import { clearShareFragment, resolveEditorSession, resolveInitialContent } from "./editor-session";
import { DOC_STORAGE_KEY } from "./persistence";
import { PREFS_STORAGE_KEY } from "./prefs";
import { sampleContent } from "./sample";

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
        schema: testSchema,
        uiLanguage: "en",
      }),
    ).toEqual(doc("A b, b a"));
  });

  test("the stored doc is used when there is no share", () => {
    const storage = new MemoryStorage();
    storage.setItem(DOC_STORAGE_KEY, JSON.stringify(doc("stored")));

    expect(
      resolveInitialContent({ fragment: "", storage, schema: testSchema, uiLanguage: "en" }),
    ).toEqual(doc("stored"));
  });

  test("the language's sample is used when storage holds nothing usable", () => {
    expect(
      resolveInitialContent({
        fragment: "",
        storage: new MemoryStorage(),
        schema: testSchema,
        uiLanguage: "de",
      }),
    ).toBe(sampleContent("de"));
  });

  test("an unrenderable stored doc falls back to the sample", () => {
    const storage = new MemoryStorage();
    storage.setItem(DOC_STORAGE_KEY, '{"type":"doc","content":[{"type":"bogus"}]}');

    expect(
      resolveInitialContent({ fragment: "", storage, schema: testSchema, uiLanguage: "fr" }),
    ).toBe(sampleContent("fr"));
  });
});

describe("resolveEditorSession", () => {
  test("resolves the initial content and the remembered toggles together", () => {
    const storage = new MemoryStorage();
    storage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ mirrorEnabled: true, finderOpen: false }));

    const session = resolveEditorSession({
      fragment: "",
      storage,
      schema: testSchema,
      uiLanguage: "en",
    });

    expect(session.content).toBe(sampleContent("en"));
    expect(session.mirrorEnabled).toBe(true);
    expect(session.finderOpen).toBe(false);
  });

  test("falls back to the defaults when nothing is stored", () => {
    const session = resolveEditorSession({
      fragment: "",
      storage: new MemoryStorage(),
      schema: testSchema,
      uiLanguage: "en",
    });

    expect(session.mirrorEnabled).toBe(false);
    expect(session.finderOpen).toBe(true);
  });

  test("a shared #t= fragment wins over the stored doc while prefs still resolve", () => {
    const storage = new MemoryStorage();
    storage.setItem(DOC_STORAGE_KEY, JSON.stringify(doc("stored")));
    storage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ mirrorEnabled: true, finderOpen: false }));

    const session = resolveEditorSession({
      fragment: `#t=${encodeURIComponent("A b, b a")}`,
      storage,
      schema: testSchema,
      uiLanguage: "en",
    });

    expect(session.content).toEqual(doc("A b, b a"));
    expect(session.mirrorEnabled).toBe(true);
    expect(session.finderOpen).toBe(false);
  });

  test("the stored doc is used when there is no share", () => {
    const storage = new MemoryStorage();
    storage.setItem(DOC_STORAGE_KEY, JSON.stringify(doc("stored")));
    storage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ mirrorEnabled: true }));

    const session = resolveEditorSession({
      fragment: "",
      storage,
      schema: testSchema,
      uiLanguage: "en",
    });

    expect(session.content).toEqual(doc("stored"));
    expect(session.mirrorEnabled).toBe(true);
  });

  test("writePref persists a patch without replaying the defaults", () => {
    const storage = new MemoryStorage();
    const session = resolveEditorSession({
      fragment: "",
      storage,
      schema: testSchema,
      uiLanguage: "en",
    });

    session.writePref({ finderOpen: false });

    expect(storage.getItem(PREFS_STORAGE_KEY)).toBe('{"finderOpen":false}');
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
