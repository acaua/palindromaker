// Mirror-editing position math.
//
// The palindrome checker only pairs letters, so all counting happens in
// "letter space": punctuation and the separators between blocks are invisible
// and every insertion/deletion point maps to exactly one symmetric point.
//
// Every function here works on `letterPositions` from analyzeDoc: the
// document position of each letter, in order, indexed by letter ordinal.

// number of letters whose document position is before docPos
export const countLettersBefore = (
  letterPositions: Array<number | undefined>,
  docPos: number,
): number => {
  let count = 0;
  for (const pos of letterPositions) {
    if (pos !== undefined && pos < docPos) {
      count += 1;
    }
  }
  return count;
};

// letter index of the letter that starts exactly at docPos
export const letterAtDocPos = (
  letterPositions: Array<number | undefined>,
  docPos: number,
): number | undefined => {
  const index = letterPositions.indexOf(docPos);
  return index === -1 ? undefined : index;
};

// doc position (pre-edit coordinates) where a character inserted before
// letter index pL must be duplicated so the text stays a palindrome;
// undefined when there is no mirror position (empty text: the first letter
// becomes the center)
export const mirrorInsertDocPos = (
  letterPositions: Array<number | undefined>,
  pL: number,
): number | undefined => {
  const total = letterPositions.length;
  if (total === 0) {
    return undefined;
  }

  const mirror = total - pL;
  if (mirror === total) {
    // insertion at the very start mirrors to after the last letter
    const last = letterPositions[total - 1];
    return last === undefined ? undefined : last + 1;
  }
  return letterPositions[mirror];
};

// doc position (pre-edit coordinates) of the letter paired with the letter
// deleted at letter index dL; undefined when the deleted letter is the center
export const mirrorDeleteDocPos = (
  letterPositions: Array<number | undefined>,
  dL: number,
): number | undefined => {
  const total = letterPositions.length;
  if (total === 0) {
    return undefined;
  }

  const mirror = total - 1 - dL;
  if (mirror === dL) {
    return undefined;
  }
  return letterPositions[mirror];
};
