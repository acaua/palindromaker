const isLetter = (char) => RegExp(/^\p{L}/, "u").test(char);

const checkPalindrome = (text) => {
  const normalizedText = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split("");

  let isPalindrome = true;
  let mirror = new Array(normalizedText.length);
  let center = undefined;

  let i = 0;
  let j = !!normalizedText.length ? normalizedText.length - 1 : 0;

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
