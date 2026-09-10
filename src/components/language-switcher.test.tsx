import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vite-plus/test";

import LanguageSwitcher from "@/components/language-switcher";
import { getUiLanguage, setUiLanguage, UI_LANGUAGES, UI_LANGUAGE_LABELS } from "@/lib/i18n";
import { readStoredPrefs } from "@/lib/persistence";

describe("LanguageSwitcher", () => {
  afterEach(() => {
    setUiLanguage("en");
    localStorage.clear();
  });

  test("lists every UI language, native names, current one selected", () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole("combobox", {
      name: "Language",
    }) as HTMLSelectElement;
    expect([...select.options].map((option) => option.value)).toEqual([...UI_LANGUAGES]);
    expect([...select.options].map((option) => option.textContent)).toEqual(
      UI_LANGUAGES.map((code) => UI_LANGUAGE_LABELS[code]),
    );
    expect(select.value).toBe(getUiLanguage());
  });

  test("choosing a language switches the UI and is remembered", () => {
    render(<LanguageSwitcher />);
    // hold the element: switching the language changes its accessible
    // name ("Language" becomes "Idioma"), so re-querying would miss it
    const select = screen.getByRole("combobox", {
      name: "Language",
    }) as HTMLSelectElement;

    fireEvent.change(select, { target: { value: "pt" } });

    expect(getUiLanguage()).toBe("pt");
    expect(select.value).toBe("pt");
    expect(readStoredPrefs(localStorage).uiLang).toBe("pt");
  });
});
