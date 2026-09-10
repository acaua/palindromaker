import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

import checkPalindrome, { isLetter, normalizeText } from "@/lib/check-palindrome";
import type { PalindromeResult } from "@/lib/check-palindrome";

// A document seen the way the palindrome checker sees it: one normalized
// text, with every index mapped back to the document position it came from.
//
// Normalization happens per character so text indexes always line up with
// `positions`, even for decomposed input ("e" + combining mark). Some
// characters have no document position of their own: the "\n" separators
// between blocks, and the extra characters a normalization expands into.
export interface DocAnalysis {
  // normalized text, index-aligned with positions
  text: string;
  // text index -> document position
  positions: Array<number | undefined>;
  // document position -> text index
  posToIndex: Map<number, number>;
  // letter ordinal ("letter space", as counted by the checker when pairing)
  // -> document position
  letterPositions: Array<number | undefined>;
  result: PalindromeResult;
}

const analyze = (doc: ProseMirrorNode): DocAnalysis => {
  let text = "";
  const positions: Array<number | undefined> = [];
  const posToIndex = new Map<number, number>();
  const letterPositions: Array<number | undefined> = [];
  let isFirstBlock = true;

  const push = (char: string, pos: number | undefined) => {
    if (pos !== undefined) posToIndex.set(pos, text.length);
    text += char;
    positions.push(pos);
    if (isLetter(char)) letterPositions.push(pos);
  };

  doc.descendants((node, pos) => {
    // only text blocks hold content that needs separating; a wrapping block
    // (blockquote, list item) must not add a separator of its own
    if (node.isTextblock) {
      if (!isFirstBlock) push("\n", undefined);
      isFirstBlock = false;
    } else if (node.isText && node.text) {
      for (let offset = 0; offset < node.text.length; offset++) {
        const normalized = normalizeText(node.text[offset]);
        // a character the checker never sees (e.g. a bare combining mark)
        // normalizes to nothing and contributes no text and no position
        for (let index = 0; index < normalized.length; index++) {
          // normalization can expand one character into several; only the
          // first keeps the document position
          push(normalized[index], index === 0 ? pos + offset : undefined);
        }
      }
    }
  });

  return {
    text,
    positions,
    posToIndex,
    letterPositions,
    result: checkPalindrome(text),
  };
};

// ProseMirror documents are immutable, so an analysis stays valid for as
// long as the node it describes. Memoizing on the node keeps the highlight
// and mirror-editing plugins from analyzing the same document twice on the
// same keystroke, without either having to know about the other; entries
// disappear with the documents themselves.
const analyses = new WeakMap<ProseMirrorNode, DocAnalysis>();

export const analyzeDoc = (doc: ProseMirrorNode): DocAnalysis => {
  const cached = analyses.get(doc);
  if (cached) return cached;

  const analysis = analyze(doc);
  analyses.set(doc, analysis);
  return analysis;
};
