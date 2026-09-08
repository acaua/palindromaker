import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import { analyzeDoc } from "@/lib/doc-analysis";
import type { DocAnalysis } from "@/lib/doc-analysis";

interface PalindromePluginState {
  analysis: DocAnalysis;
  // what the toolbar needs to know about the document, so it does not have
  // to re-derive it from the doc on every transaction
  hasLetters: boolean;
  isPalindrome: boolean;
  baseDecorations: DecorationSet;
  decorations: DecorationSet;
}

export const palindromePluginKey = new PluginKey<PalindromePluginState>(
  "palindrome",
);

// first and last document position mapped by the text range [from, to];
// normalization leaves some characters (block separators, expansions)
// without a position of their own, so the ends are scanned inwards
const firstMappedPos = (
  positions: Array<number | undefined>,
  from: number,
  to: number,
): number | undefined => {
  for (let index = from; index <= to; index++) {
    const pos = positions[index];
    if (pos !== undefined) return pos;
  }
  return undefined;
};

const lastMappedPos = (
  positions: Array<number | undefined>,
  from: number,
  to: number,
): number | undefined => {
  for (let index = to; index >= from; index--) {
    const pos = positions[index];
    if (pos !== undefined) return pos;
  }
  return undefined;
};

// center and gap decorations depend only on the document, not the selection
const computeBaseDecorations = (
  doc: ProseMirrorNode,
  analysis: DocAnalysis,
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
  }

  // the gap exists on its own: text whose outermost letters already differ
  // ("hello world") breaks without ever producing a center
  if (result.gap) {
    const [gapStart, gapEnd] = result.gap;
    const from = firstMappedPos(positions, gapStart, gapEnd);
    const to = lastMappedPos(positions, gapStart, gapEnd);

    if (from !== undefined && to !== undefined) {
      decorations.push(
        Decoration.inline(from, to + 1, { class: "bg-red-300" }),
      );
    }
  }

  return DecorationSet.create(doc, decorations);
};

const computeCaretDecorations = (
  state: EditorState,
  analysis: DocAnalysis,
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
  analysis: DocAnalysis,
  baseDecorations: DecorationSet,
): PalindromePluginState => {
  const caretDecorations = computeCaretDecorations(state, analysis);
  return {
    analysis,
    hasLetters: analysis.letterPositions.length > 0,
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
        const analysis = analyzeDoc(state.doc);
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
          ? analyzeDoc(newState.doc)
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
