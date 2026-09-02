import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import checkPalindromeBase from "@/lib/check-palindrome";

interface PalindromePluginState {
  isPalindrome: boolean;
  decorations: DecorationSet;
}

export const palindromePluginKey = new PluginKey<PalindromePluginState>(
  "palindrome",
);

// map every character of the joined text to its document position;
// the "\n" separators between blocks have no document position
const analyzeDoc = (doc: ProseMirrorNode) => {
  let text = "";
  const positions: Array<number | undefined> = [];
  let isFirstBlock = true;

  doc.descendants((node, pos) => {
    if (node.isBlock) {
      if (!isFirstBlock) {
        text += "\n";
        positions.push(undefined);
      }
      isFirstBlock = false;
    } else if (node.isText && node.text) {
      text += node.text;
      for (let offset = 0; offset < node.text.length; offset++) {
        positions.push(pos + offset);
      }
    }
  });

  return { text, positions };
};

const computeState = (state: EditorState): PalindromePluginState => {
  const { text, positions } = analyzeDoc(state.doc);
  const result = checkPalindromeBase(text);
  const decorations: Decoration[] = [];

  if (result.center) {
    const [centerStart, centerEnd] = result.center;
    const startPos = positions[centerStart];
    const endPos = positions[centerEnd];

    if (startPos !== undefined) {
      decorations.push(
        Decoration.inline(startPos, startPos + 1, {
          class: "pm-center1 bg-blue-200",
        }),
      );
    }
    if (endPos !== undefined) {
      decorations.push(
        Decoration.inline(endPos, endPos + 1, {
          class: "pm-center2 bg-blue-200",
        }),
      );
    }

    if (!result.isPalindrome) {
      const gapStart = positions[centerStart + 1];

      if (
        startPos !== undefined &&
        gapStart !== undefined &&
        endPos !== undefined &&
        endPos > gapStart
      ) {
        decorations.push(
          Decoration.inline(gapStart, endPos, { class: "bg-red-300" }),
        );
      }
    }
  }

  const anchor = state.selection.from;
  const anchorIndex = positions.findIndex((pos) => pos === anchor);

  if (anchorIndex >= 0) {
    const mirrorIndex = result.mirror[anchorIndex];
    const mirrorPos =
      mirrorIndex === undefined ? undefined : positions[mirrorIndex];

    if (mirrorPos !== undefined) {
      decorations.push(
        Decoration.inline(mirrorPos, mirrorPos + 1, { class: "bg-purple-400" }),
      );
      decorations.push(
        Decoration.inline(anchor, anchor + 1, { class: "bg-purple-200" }),
      );
    }
  }

  return {
    isPalindrome: result.isPalindrome,
    decorations: DecorationSet.create(state.doc, decorations),
  };
};

export const Palindrome = Extension.create({
  name: "palindrome",

  addProseMirrorPlugins() {
    return [
      new Plugin<PalindromePluginState>({
        key: palindromePluginKey,
        state: {
          init: (_, state) => computeState(state),
          apply: (_, __, ___, newState) => computeState(newState),
        },
        props: {
          decorations: (state) =>
            palindromePluginKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});
