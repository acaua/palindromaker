import type { EditorState } from "@tiptap/pm/state";

import { analyzeDoc } from "@/lib/doc-analysis";
import { mirrorEnabled } from "@/lib/mirror-extension";
import { MAX_SHARE_TEXT } from "@/lib/share-link";

// Everything the card's footer needs to know about the editor, derived from
// one pass over the state. The palindrome plugin stores the analysis and the
// mirror plugin stores the toggle, but a consumer that wants both had to
// reach into two PluginKeys and re-derive the rules itself; this is that one
// interface instead. `overLimit` rides the raw text — what a share link
// actually encodes and what the reader caps on decode — not the normalized
// text, which can be shorter once combining marks are stripped.
export interface EditorFacts {
  hasLetters: boolean;
  isPalindrome: boolean;
  mirrorEnabled: boolean;
  // the document's original text, blocks joined with "\n"
  raw: string;
  overLimit: boolean;
  shareable: boolean;
}

// the pre-mount answer, so a selector can return facts before the editor exists.
// The empty document reads as a vacuous palindrome, like editorFacts says;
// the `!editor` guard in editor.tsx keeps this off-DOM regardless.
export const EMPTY_FACTS: EditorFacts = {
  hasLetters: false,
  isPalindrome: true,
  mirrorEnabled: false,
  raw: "",
  overLimit: false,
  shareable: false,
};

export const editorFacts = (state: EditorState): EditorFacts => {
  const analysis = analyzeDoc(state.doc);
  const hasLetters = analysis.letterPositions.length > 0;
  const isPalindrome = analysis.result.isPalindrome;
  // hasLetters, because an empty document is vacuously a palindrome; the cap
  // matches readShareText, which rejects a decoded raw string over the limit
  const overLimit = analysis.raw.length > MAX_SHARE_TEXT;
  return {
    hasLetters,
    isPalindrome,
    mirrorEnabled: mirrorEnabled(state),
    raw: analysis.raw,
    overLimit,
    shareable: hasLetters && isPalindrome && !overLimit,
  };
};
