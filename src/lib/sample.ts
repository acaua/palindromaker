import type { UiLanguage } from "@/lib/i18n";

// what the editor starts with when storage holds nothing usable; lives in
// its own module so the e2e suite can assert on it without importing the
// editor (and TipTap with it). Every language starts on a palindrome of
// its own; all of them are verified palindromes.
export const SAMPLE_CONTENT = "Eva, can I stab bats in a cave?";
export const SAMPLE_CONTENT_PT = "A grama é amarga";

const SAMPLE_CONTENT_BY_LANG: Record<UiLanguage, string> = {
  pt: SAMPLE_CONTENT_PT,
  en: SAMPLE_CONTENT,
  es: "Anita lava la tina",
  de: "Trug Tim eine so helle Hose nie mit Gurt?",
  fr: "Élu par cette crapule",
  it: "I topi non avevano nipoti",
};

// the e2e suite runs with Playwright's default en-US locale, so its
// SAMPLE_CONTENT assertions hold wherever the UI language resolves to en;
// the pt path is covered by the pt-BR locale describe
export const sampleContent = (lang: UiLanguage): string => SAMPLE_CONTENT_BY_LANG[lang];
