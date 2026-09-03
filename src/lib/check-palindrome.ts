export interface PalindromeResult {
  isPalindrome: boolean;
  mirror: Array<number | undefined>;
  center: [number, number] | undefined;
  normalizedText: string;
}

export const isLetter = (char: string): boolean => /^\p{L}/u.test(char);

export const normalizeChar = (char: string): string =>
  char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export const normalizeText = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const checkPalindrome = (text: string): PalindromeResult => {
  const normalizedText = normalizeText(text);
  if (normalizedText === "") {
    return {
      isPalindrome: true,
      mirror: [],
      center: undefined,
      normalizedText,
    };
  }

  let isPalindrome = true;
  const mirror: Array<number | undefined> = new Array(normalizedText.length);
  let center: [number, number] | undefined = undefined;

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

    isPalindrome = false;
    break;
  }

  return { isPalindrome, mirror, center, normalizedText };
};

export default checkPalindrome;
