import { describe, expect, test } from "vite-plus/test";
import { EditorState } from "@tiptap/pm/state";

import { buildDoc } from "@/test/schema";
import { EMPTY_FACTS, editorFacts } from "./editor-facts";
import { createMirrorPlugin, mirrorPluginKey } from "./mirror-extension";
import { MAX_SHARE_TEXT } from "./share-link";

const createState = (text: string, options?: { enabled?: boolean; mirror?: boolean }) =>
  EditorState.create({
    doc: buildDoc(text),
    plugins: options?.mirror === false ? [] : [createMirrorPlugin({ enabled: options?.enabled })],
  });

const enableMirror = (state: EditorState) =>
  state.apply(state.tr.setMeta(mirrorPluginKey, { enabled: true }));

describe("editorFacts", () => {
  test("the pre-mount fallback agrees with an empty document", () => {
    expect(EMPTY_FACTS).toMatchObject({
      hasLetters: false,
      isPalindrome: true,
      shareable: false,
      overLimit: false,
      raw: "",
    });
  });

  test("reports an empty document as a vacuous palindrome that cannot be shared", () => {
    expect(editorFacts(createState(""))).toMatchObject({
      hasLetters: false,
      isPalindrome: true,
      shareable: false,
      overLimit: false,
      raw: "",
    });
  });

  test("reports a non-palindrome with letters", () => {
    expect(editorFacts(createState("abc"))).toMatchObject({
      hasLetters: true,
      isPalindrome: false,
      shareable: false,
    });
  });

  test("reports a finished palindrome as shareable", () => {
    expect(editorFacts(createState("aba"))).toMatchObject({
      hasLetters: true,
      isPalindrome: true,
      shareable: true,
      overLimit: false,
      raw: "aba",
    });
  });

  test("joins blocks with a newline in the raw text", () => {
    expect(editorFacts(createState("ab\nba")).raw).toBe("ab\nba");
  });

  test("reports the mirror-editing toggle from the mirror plugin", () => {
    expect(editorFacts(createState("aba"))).toMatchObject({ mirrorEnabled: false });
    expect(editorFacts(enableMirror(createState("aba")))).toMatchObject({
      mirrorEnabled: true,
    });
  });

  test("defaults to mirror off when the mirror plugin is absent", () => {
    expect(editorFacts(createState("aba", { mirror: false }))).toMatchObject({
      mirrorEnabled: false,
    });
  });

  test("caps on the raw length, at the boundary", () => {
    const atLimit = "a".repeat(MAX_SHARE_TEXT);
    expect(editorFacts(createState(atLimit))).toMatchObject({ overLimit: false, shareable: true });

    const overLimit = "a".repeat(MAX_SHARE_TEXT + 1);
    expect(editorFacts(createState(overLimit))).toMatchObject({
      overLimit: true,
      shareable: false,
    });
  });

  test("caps on raw, not normalized, even when combining marks shorten the text", () => {
    // 1001 "e" plus a combining acute: raw is 2002 (over the cap) while the
    // normalized text is 1001 letters — the old gate read the normalized
    // length and enabled a share the reader then refused
    const state = createState("e\u0301".repeat(1001));
    expect(editorFacts(state)).toMatchObject({
      hasLetters: true,
      isPalindrome: true,
      overLimit: true,
      shareable: false,
    });
  });
});
