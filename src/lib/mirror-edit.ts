import { isLetter } from "@/lib/check-palindrome";

// Mirror-editing position math.
//
// The palindrome checker only pairs letters, so all counting happens in
// "letter space": punctuation and the separators between blocks are invisible
// and every insertion/deletion point maps to exactly one symmetric point.

export const letterIndices = (text: string): number[] => {
  const indices: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (isLetter(text[i])) {
      indices.push(i);
    }
  }
  return indices;
};

// number of letters whose document position is before docPos
export const countLettersBefore = (
  letterIdxs: number[],
  positions: Array<number | undefined>,
  docPos: number,
): number => {
  let count = 0;
  for (const idx of letterIdxs) {
    const pos = positions[idx];
    if (pos !== undefined && pos < docPos) {
      count += 1;
    }
  }
  return count;
};

// letter index of the letter that starts exactly at docPos
export const letterAtDocPos = (
  letterIdxs: number[],
  positions: Array<number | undefined>,
  docPos: number,
): number | undefined => {
  for (let index = 0; index < letterIdxs.length; index++) {
    if (positions[letterIdxs[index]] === docPos) {
      return index;
    }
  }
  return undefined;
};

const letterPos = (
  letterIdxs: number[],
  positions: Array<number | undefined>,
  letterIndex: number,
): number | undefined => positions[letterIdxs[letterIndex]];

// doc position (pre-edit coordinates) where a character inserted before
// letter index pL must be duplicated so the text stays a palindrome;
// undefined when there is no mirror position (empty text: the first letter
// becomes the center)
export const mirrorInsertDocPos = (
  letterIdxs: number[],
  positions: Array<number | undefined>,
  pL: number,
): number | undefined => {
  const total = letterIdxs.length;
  if (total === 0) {
    return undefined;
  }

  const mirror = total - pL;
  if (mirror === total) {
    // insertion at the very start mirrors to after the last letter
    const last = letterPos(letterIdxs, positions, total - 1);
    return last === undefined ? undefined : last + 1;
  }
  return letterPos(letterIdxs, positions, mirror);
};

// doc position (pre-edit coordinates) of the letter paired with the letter
// deleted at letter index dL; undefined when the deleted letter is the center
export const mirrorDeleteDocPos = (
  letterIdxs: number[],
  positions: Array<number | undefined>,
  dL: number,
): number | undefined => {
  const total = letterIdxs.length;
  if (total === 0) {
    return undefined;
  }

  const mirror = total - 1 - dL;
  if (mirror === dL) {
    return undefined;
  }
  return letterPos(letterIdxs, positions, mirror);
};
