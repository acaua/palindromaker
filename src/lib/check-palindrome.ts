export interface PalindromeResult {
  isPalindrome: boolean;
  mirror: Array<number | undefined>;
  // innermost pair of matching letters, undefined when nothing matched
  center: [number, number] | undefined;
  // inclusive range of the letters that could not be paired, undefined
  // while the text still reads the same both ways
  gap: [number, number] | undefined;
  normalizedText: string;
}

export const isLetter = (char: string): boolean => /^\p{L}/u.test(char);

// decomposes, drops combining marks and lowercases; safe to apply one
// character at a time (analyzeDoc does, to keep text indexes aligned with
// document positions), where it can also normalize to nothing
export const normalizeText = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const checkPalindrome = (text: string): PalindromeResult => {
  const normalizedText = normalizeText(text);
  if (normalizedText === "") {
    return {
      isPalindrome: true,
      mirror: [],
      center: undefined,
      gap: undefined,
      normalizedText,
    };
  }

  let isPalindrome = true;
  const mirror: Array<number | undefined> = new Array(normalizedText.length);
  let center: [number, number] | undefined = undefined;
  let gap: [number, number] | undefined = undefined;

  let i = 0;
  let j = normalizedText.length - 1;

  while (i <= j) {
    if (!isLetter(normalizedText[i])) {
      i = i + 1;
      continue;
    }
    if (!isLetter(normalizedText[j])) {
      j = j - 1;
      continue;
    }

    if (normalizedText[i] === normalizedText[j]) {
      mirror[i] = j;
      mirror[j] = i;
      center = [i, j];
      i = i + 1;
      j = j - 1;
      continue;
    }

    // the outermost letters that disagree bound everything still unpaired
    isPalindrome = false;
    gap = [i, j];
    break;
  }

  return { isPalindrome, mirror, center, gap, normalizedText };
};

export default checkPalindrome;
