import checkPalindrome from "./check-palindrome";

describe("isPalindrome", () => {
  test("A man, a plan... is a palindrome", () => {
    const { isPalindrome } = checkPalindrome("A man, a plan, a canal: Panama!");

    expect(isPalindrome).toBe(true);
  });

  test("Abobrinhas não is not a palindrome", () => {
    const { isPalindrome } = checkPalindrome("Abobrinhas não");

    expect(isPalindrome).toBe(false);
  });
});

test("Normalize text", () => {
  const { normalizedText } = checkPalindrome("ãàáéèê :,;?!");

  expect(normalizedText).toEqual("aaaeee :,;?!");
});

describe("center", () => {
  test("Find separate center", () => {
    const { center } = checkPalindrome("A b, b a");

    expect(center).toEqual([2, 5]);
  });

  test("Find single center", () => {
    const { center } = checkPalindrome("A, b: a!");

    expect(center).toEqual([3, 3]);
  });
});

test("Mirror", () => {
  const { mirror } = checkPalindrome("A b, cb a!");

  expect(mirror).toEqual([
    8,
    undefined,
    6,
    undefined,
    undefined,
    5,
    2,
    undefined,
    0,
    undefined,
  ]);
});
