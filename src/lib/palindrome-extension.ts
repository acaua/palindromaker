import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import checkPalindromeBase, { normalizeChar } from "@/lib/check-palindrome";
import type { PalindromeResult } from "@/lib/check-palindrome";

interface PalindromeAnalysis {
  result: PalindromeResult;
  positions: Array<number | undefined>;
  // doc position -> index in the normalized text
  posToIndex: Map<number, number>;
}

interface PalindromePluginState {
  analysis: PalindromeAnalysis;
  isPalindrome: boolean;
  baseDecorations: DecorationSet;
  decorations: DecorationSet;
}

export const palindromePluginKey = new PluginKey<PalindromePluginState>(
  "palindrome",
);

// map every character of the joined text to its document position; the
// text is normalized per character so its indexes always line up with the
// positions array, even for decomposed input ("e" + combining mark);
// the "\n" separators between blocks have no document position
export const analyzeDoc = (doc: ProseMirrorNode) => {
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
      for (let offset = 0; offset < node.text.length; offset++) {
        const normalized = normalizeChar(node.text[offset]);
        // characters the checker never sees (e.g. a bare combining mark)
        // get no text and no position
        if (normalized === "") continue;
        text += normalized;
        positions.push(pos + offset);
        // normalization can expand one char into several; only the first
        // keeps a document position
        for (let extra = 1; extra < normalized.length; extra++) {
          positions.push(undefined);
        }
      }
    }
  });

  return { text, positions };
};

const computeAnalysis = (doc: ProseMirrorNode): PalindromeAnalysis => {
  const { text, positions } = analyzeDoc(doc);
  const result = checkPalindromeBase(text);
  const posToIndex = new Map<number, number>();
  for (let index = 0; index < positions.length; index++) {
    const pos = positions[index];
    if (pos !== undefined) {
      posToIndex.set(pos, index);
    }
  }
  return { result, positions, posToIndex };
};

// center and gap decorations depend only on the document, not the selection
const computeBaseDecorations = (
  doc: ProseMirrorNode,
  analysis: PalindromeAnalysis,
): DecorationSet => {
  const { result, positions } = analysis;
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

  return DecorationSet.create(doc, decorations);
};

const computeCaretDecorations = (
  state: EditorState,
  analysis: PalindromeAnalysis,
): Decoration[] => {
  const anchorIndex = analysis.posToIndex.get(state.selection.from);
  if (anchorIndex === undefined) return [];

  const mirrorIndex = analysis.result.mirror[anchorIndex];
  const mirrorPos =
    mirrorIndex === undefined ? undefined : analysis.positions[mirrorIndex];
  if (mirrorPos === undefined) return [];

  return [
    Decoration.inline(mirrorPos, mirrorPos + 1, { class: "bg-purple-400" }),
    Decoration.inline(state.selection.from, state.selection.from + 1, {
      class: "bg-purple-200",
    }),
  ];
};

const buildState = (
  state: EditorState,
  analysis: PalindromeAnalysis,
  baseDecorations: DecorationSet,
): PalindromePluginState => {
  const caretDecorations = computeCaretDecorations(state, analysis);
  return {
    analysis,
    isPalindrome: analysis.result.isPalindrome,
    baseDecorations,
    decorations: caretDecorations.length
      ? baseDecorations.add(state.doc, caretDecorations)
      : baseDecorations,
  };
};

export const createPalindromePlugin = () =>
  new Plugin<PalindromePluginState>({
    key: palindromePluginKey,
    state: {
      init: (_, state) => {
        const analysis = computeAnalysis(state.doc);
        return buildState(
          state,
          analysis,
          computeBaseDecorations(state.doc, analysis),
        );
      },
      apply: (tr, prev, _oldState, newState) => {
        // meta-only transactions change nothing the decorations depend on
        if (!tr.docChanged && !tr.selectionSet) {
          return prev;
        }
        // the analysis only depends on the document: reuse it for
        // selection-only transactions (caret moves)
        const analysis = tr.docChanged
          ? computeAnalysis(newState.doc)
          : prev.analysis;
        const baseDecorations = tr.docChanged
          ? computeBaseDecorations(newState.doc, analysis)
          : prev.baseDecorations;
        return buildState(newState, analysis, baseDecorations);
      },
    },
    props: {
      decorations: (state) => palindromePluginKey.getState(state)?.decorations,
    },
  });

export const Palindrome = Extension.create({
  name: "palindrome",

  addProseMirrorPlugins() {
    return [createPalindromePlugin()];
  },
});
