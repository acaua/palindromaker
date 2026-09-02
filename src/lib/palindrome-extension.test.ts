import { describe, expect, test } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import type { DecorationSet } from "@tiptap/pm/view";

import {
  analyzeDoc,
  createPalindromePlugin,
  palindromePluginKey,
} from "./palindrome-extension";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "text*" },
    text: { group: "inline" },
  },
});

const buildDoc = (text: string) =>
  schema.node(
    "doc",
    null,
    text
      .split("\n")
      .map((paragraph) =>
        schema.node(
          "paragraph",
          null,
          paragraph ? [schema.text(paragraph)] : [],
        ),
      ),
  );

const createState = (text: string) =>
  EditorState.create({
    doc: buildDoc(text),
    plugins: [createPalindromePlugin()],
  });

// Decoration.type holds the attrs but is not part of the public typings
const decorationSummaries = (set: DecorationSet) =>
  set.find().map((deco) => {
    const type = (
      deco as unknown as {
        type: { attrs: { class?: string } };
      }
    ).type;
    return {
      from: deco.from,
      to: deco.to,
      class: type.attrs.class ?? "",
    };
  });

describe("analyzeDoc", () => {
  test("maps each character to its doc position", () => {
    const { text, positions } = analyzeDoc(buildDoc("aé"));

    expect(text).toBe("ae");
    expect(positions).toEqual([1, 2]);
  });

  test("separates paragraphs with unmapped newlines", () => {
    const { text, positions } = analyzeDoc(buildDoc("ab\nba"));

    expect(text).toBe("ab\nba");
    expect(positions).toEqual([1, 2, undefined, 5, 6]);
  });

  test("drops characters the normalizer removes", () => {
    // "e" + combining acute + "a": the mark has no doc position of its own
    const { text, positions } = analyzeDoc(buildDoc("e\u0301a"));

    expect(text).toBe("ea");
    expect(positions).toEqual([1, 3]);
  });

  test("keeps positions aligned when a mark opens the text", () => {
    // decomposed "éabae" normalizes to the palindrome "eabae"; without
    // alignment the center would land on the combining mark at doc
    // position 2 instead of the "b" at 4
    const { text, positions } = analyzeDoc(buildDoc("e\u0301abae"));

    expect(text).toBe("eabae");
    expect(positions).toEqual([1, 3, 4, 5, 6]);
  });
});

describe("palindrome plugin", () => {
  test("marks the center characters of a palindrome", () => {
    const pluginState = palindromePluginKey.getState(createState("aba"));

    expect(pluginState?.isPalindrome).toBe(true);
    const centerClasses = decorationSummaries(pluginState!.decorations)
      .map((deco) => deco.class)
      .filter((cls) => cls.startsWith("pm-center"));
    expect(centerClasses).toHaveLength(2);
    expect(centerClasses).toContain("pm-center1 bg-blue-200");
    expect(centerClasses).toContain("pm-center2 bg-blue-200");
  });

  test("marks the gap that breaks the palindrome", () => {
    const pluginState = palindromePluginKey.getState(createState("abc a"));

    expect(pluginState?.isPalindrome).toBe(false);
    const gap = decorationSummaries(pluginState!.decorations).find((deco) =>
      deco.class.includes("bg-red-300"),
    );
    // the gap covers "bc " between the outer "a" pair
    expect(gap?.from).toBe(2);
    expect(gap?.to).toBe(5);
  });

  test("highlights the mirrored character of the caret position", () => {
    const base = createState("aba");
    const state = base.apply(
      base.tr.setSelection(TextSelection.create(base.doc, 1)),
    );
    const summaries = decorationSummaries(
      palindromePluginKey.getState(state)!.decorations,
    );

    // the caret on the first "a" is mirrored by the last "a"
    expect(summaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 3, to: 4, class: "bg-purple-400" }),
        expect.objectContaining({ from: 1, to: 2, class: "bg-purple-200" }),
      ]),
    );
  });
});

describe("analysis caching", () => {
  test("selection-only transactions reuse the analysis", () => {
    const base = createState("aba");
    const before = palindromePluginKey.getState(base);

    const moved = base.apply(
      base.tr.setSelection(TextSelection.create(base.doc, 2)),
    );
    const after = palindromePluginKey.getState(moved);

    expect(after?.analysis).toBe(before?.analysis);
    // the caret highlight still follows the new selection
    expect(decorationSummaries(after!.decorations)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: 2, to: 3, class: "bg-purple-400" }),
      ]),
    );
  });

  test("meta-only transactions keep the plugin state untouched", () => {
    const base = createState("aba");
    const before = palindromePluginKey.getState(base);

    const after = base.apply(base.tr.setMeta("unrelated", true));

    expect(palindromePluginKey.getState(after)).toBe(before);
  });

  test("doc changes recompute the analysis", () => {
    const base = createState("aba");
    const before = palindromePluginKey.getState(base);

    const typed = base.apply(base.tr.insertText("x", 4));
    const after = palindromePluginKey.getState(typed);

    expect(after?.analysis).not.toBe(before?.analysis);
    expect(after?.isPalindrome).toBe(false);
  });
});
