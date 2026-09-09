import { TextSelection } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";

import { isLetter, normalizeText } from "@/lib/check-palindrome";
import { analyzeDoc } from "@/lib/doc-analysis";
import type { DocAnalysis } from "@/lib/doc-analysis";
import { mirrorWord } from "@/lib/dictionary";
import { countLettersBefore, mirrorInsertDocPos } from "@/lib/mirror-edit";

// Putting a whole word into the document, the way mirror typing puts a
// single character into it: the word goes in at the caret and its mirror at
// the symmetric point in letter space, so a palindrome stays a palindrome.
//
// Nothing is ever deleted: the word is inserted at the caret even when text
// is selected, because removing a range would also have to remove whatever
// it is paired with on the other side.

// what inserting a word will do, which is also what the finder tells the
// user before the click: mirror both sides, insert at the caret only, or
// insert at the caret because mirroring is waiting for the text to read the
// same both ways again
export type WordInsertMode = "mirrored" | "caret" | "paused";

interface WordInsertion {
  // document positions in pre-edit coordinates, ordered so that applying
  // them in sequence leaves the remaining positions valid
  inserts: Array<{ pos: number; text: string }>;
  // where the caret ends up once every insert is applied: right after the
  // word on the caret's own side, which is where typing it would have left
  // it and where the next word goes
  caret: number;
}

const charAt = (analysis: DocAnalysis, pos: number): string | undefined => {
  const index = analysis.posToIndex.get(pos);
  return index === undefined ? undefined : analysis.text[index];
};

// a letter of the document sits at pos; positions outside the text (block
// boundaries, the ends of the document) have no character and no letter
const hasLetterAt = (analysis: DocAnalysis, pos: number): boolean => {
  const char = charAt(analysis, pos);
  return char !== undefined && isLetter(char);
};

// the same test the finder's "palindrome word" marker uses
const readsTheSameBothWays = (word: string): boolean =>
  normalizeText(mirrorWord(word)) === normalizeText(word);

const planWordInsert = (
  analysis: DocAnalysis,
  caret: number,
  word: string,
  mode: WordInsertMode,
): WordInsertion => {
  // the checker skips spaces, so padding can never break a palindrome; it
  // only keeps the inserted word from fusing with a letter next to it
  const at = (pos: number, text: string) => {
    const lead = hasLetterAt(analysis, pos - 1) ? " " : "";
    const trail = hasLetterAt(analysis, pos) ? " " : "";
    return { pos, text: `${lead}${text}${trail}`, lead: lead.length };
  };

  const caretOnly = (text: string): WordInsertion => {
    const insert = at(caret, text);
    return {
      inserts: [{ pos: insert.pos, text: insert.text }],
      caret: caret + insert.lead + word.length,
    };
  };

  if (mode !== "mirrored") {
    return caretOnly(word);
  }

  const { letterPositions } = analysis;
  const before = countLettersBefore(letterPositions, caret);

  // the caret is the center in letter space: a word that already reads the
  // same both ways is its own mirror and goes in once, any other word
  // brings its mirror in beside it. An empty document is this case, and
  // the word becomes the whole palindrome.
  if (2 * before === letterPositions.length) {
    return caretOnly(
      readsTheSameBothWays(word) ? word : `${word} ${mirrorWord(word)}`,
    );
  }

  const mirrorPos = mirrorInsertDocPos(letterPositions, before);
  if (mirrorPos === undefined) {
    return caretOnly(word);
  }

  // the two points can only coincide at the center, handled above
  const own = at(caret, word);
  const other = at(mirrorPos, mirrorWord(word));
  return {
    // inserting at the later position first leaves the earlier one intact
    inserts: [own, other]
      .sort((a, b) => b.pos - a.pos)
      .map(({ pos, text }) => ({ pos, text })),
    caret:
      caret +
      own.lead +
      word.length +
      // an insert before the caret pushes it along
      (mirrorPos < caret ? other.text.length : 0),
  };
};

// The whole insertion as one transaction: both halves of the word and the
// caret between them, so it also undoes in one step.
export const wordInsertTransaction = (
  state: EditorState,
  word: string,
  mode: WordInsertMode,
): Transaction => {
  const caret = state.selection.from;
  const plan = planWordInsert(analyzeDoc(state.doc), caret, word, mode);

  const tr = state.tr;
  for (const insert of plan.inserts) {
    tr.insertText(insert.text, insert.pos);
  }
  return tr.setSelection(TextSelection.create(tr.doc, plan.caret));
};
