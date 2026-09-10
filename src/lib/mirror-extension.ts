import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { ReplaceStep } from "@tiptap/pm/transform";

import { isLetter, normalizeText } from "@/lib/check-palindrome";
import { analyzeDoc } from "@/lib/doc-analysis";
import {
  countLettersBefore,
  letterAtDocPos,
  mirrorDeleteDocPos,
  mirrorInsertDocPos,
} from "@/lib/mirror-edit";
import { wordInsertTransaction } from "@/lib/word-insert";
import type { WordInsertMode } from "@/lib/word-insert";

export interface MirrorEditingOptions {
  // state the toggle starts in, e.g. restored from a previous session
  enabled: boolean;
  // called with the new state every time the toggle command runs, so
  // remembering the choice lives next to restoring it
  onChange?: (enabled: boolean) => void;
}

interface MirrorEditingPluginState {
  enabled: boolean;
}

type MirrorMeta = { enabled: boolean } | { own: true };

export const mirrorPluginKey = new PluginKey<MirrorEditingPluginState>("mirrorEditing");

// decides where a single-character edit has to be duplicated so the text
// stays a palindrome; returns null when the edit must be left untouched
const mirrorEdits = (
  transactions: readonly Transaction[],
  oldState: EditorState,
  newState: EditorState,
): Transaction | null => {
  if (!mirrorPluginKey.getState(newState)?.enabled) {
    return null;
  }

  // never react to our own mirror edits or to IME compositions
  if (
    transactions.some((tr) => {
      const meta = tr.getMeta(mirrorPluginKey) as MirrorMeta | undefined;
      return (meta !== undefined && "own" in meta) || !!tr.getMeta("composition");
    })
  ) {
    return null;
  }

  // only simple, single-step user edits are mirrored; anything else (paste,
  // paragraph joins, undo/redo of combined events, multi-char replacements)
  // is left untouched
  const docChanges = transactions.filter((tr) => tr.docChanged);
  if (docChanges.length !== 1 || docChanges[0].steps.length !== 1) {
    return null;
  }
  const step = docChanges[0].steps[0];
  if (!(step instanceof ReplaceStep)) {
    return null;
  }

  // mirroring is only meaningful while the pre-edit text is a palindrome;
  // letter positions are read from the pre-edit document
  const { result, letterPositions } = analyzeDoc(oldState.doc);
  if (!result.isPalindrome) {
    return null;
  }

  // plain typing: a single text character inserted into an empty range
  if (
    step.from === step.to &&
    step.slice.openStart === 0 &&
    step.slice.openEnd === 0 &&
    step.slice.content.childCount === 1
  ) {
    const typed = step.slice.content.firstChild;
    if (!typed?.isText || !typed.text || typed.text.length !== 1) {
      return null;
    }
    if (!isLetter(normalizeText(typed.text))) {
      // letters pair up; anything the checker skips needs no mirror edit
      return null;
    }

    const pL = countLettersBefore(letterPositions, step.from);
    const mirrorPos = mirrorInsertDocPos(letterPositions, pL);
    if (mirrorPos === undefined) {
      return null;
    }

    // the typed character is already part of newState: positions at or after
    // the insertion point shifted by one
    const adjusted = mirrorPos >= step.from ? mirrorPos + 1 : mirrorPos;
    return newState.tr.insert(adjusted, typed).setMeta(mirrorPluginKey, { own: true });
  }

  // plain deletion: a single character removed from an empty slice
  if (step.to - step.from === 1 && step.slice.content.size === 0) {
    const deleted = oldState.doc.textBetween(step.from, step.to, "\n", "\n");
    if (deleted.length !== 1 || !isLetter(normalizeText(deleted))) {
      return null;
    }

    const dL = letterAtDocPos(letterPositions, step.from);
    if (dL === undefined) {
      return null;
    }
    const mirrorPos = mirrorDeleteDocPos(letterPositions, dL);
    if (mirrorPos === undefined) {
      // the center letter keeps the text a palindrome on its own
      return null;
    }

    // the deleted character is already gone in newState: positions after the
    // deletion point shifted back by one
    const adjusted = mirrorPos > step.from ? mirrorPos - 1 : mirrorPos;
    return newState.tr.delete(adjusted, adjusted + 1).setMeta(mirrorPluginKey, { own: true });
  }

  return null;
};

// What inserting a word from the finder will do, and what the finder says
// it will do. Mirroring is only meaningful while the text reads the same
// both ways, so a word follows the same rule as a keystroke.
export const wordInsertMode = (state: EditorState): WordInsertMode => {
  if (!mirrorPluginKey.getState(state)?.enabled) {
    return "caret";
  }
  return analyzeDoc(state.doc).result.isPalindrome ? "mirrored" : "paused";
};

// The transaction the insertWord command dispatches: both halves of the
// word and the caret between them, marked as this plugin's own edit. The
// mark matters — a one-letter word is a single-character insert, which
// appendTransaction would otherwise mirror a second time.
export const wordInsertTransactionFor = (state: EditorState, word: string): Transaction =>
  wordInsertTransaction(state, word, wordInsertMode(state)).setMeta(mirrorPluginKey, { own: true });

export const createMirrorPlugin = ({ enabled = false } = {}) =>
  new Plugin<MirrorEditingPluginState>({
    key: mirrorPluginKey,
    state: {
      init: () => ({ enabled }),
      apply: (tr, prev) => {
        const meta = tr.getMeta(mirrorPluginKey) as MirrorMeta | undefined;
        if (!meta || "own" in meta) {
          return prev;
        }
        return { enabled: meta.enabled };
      },
    },
    appendTransaction: (transactions, oldState, newState) =>
      mirrorEdits(transactions, oldState, newState),
  });

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mirrorEditing: {
      toggleMirrorEditing: () => ReturnType;
      insertWord: (word: string) => ReturnType;
    };
  }
}

export const MirrorEditing = Extension.create<MirrorEditingOptions>({
  name: "mirrorEditing",

  addOptions() {
    return { enabled: false };
  },

  addCommands() {
    return {
      toggleMirrorEditing:
        () =>
        ({ state, dispatch }) => {
          const enabled = !(mirrorPluginKey.getState(state)?.enabled ?? false);
          if (dispatch) {
            dispatch(state.tr.setMeta(mirrorPluginKey, { enabled }));
            this.options.onChange?.(enabled);
          }
          return true;
        },

      insertWord:
        (word: string) =>
        ({ state, dispatch }) => {
          if (dispatch) {
            dispatch(wordInsertTransactionFor(state, word));
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [createMirrorPlugin({ enabled: this.options.enabled })];
  },
});
