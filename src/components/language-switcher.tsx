import { useI18n } from "@/hooks/use-i18n";
import { setUiLanguage, UI_LANGUAGES, UI_LANGUAGE_LABELS } from "@/lib/i18n";
import type { UiLanguage } from "@/lib/i18n";
import { localStorageOrNull, writePrefs } from "@/lib/persistence";

// the header's language picker, styled like the finder's dictionary
// select; the choice is remembered like the mirror toggle
export default function LanguageSwitcher() {
  const storage = localStorageOrNull();
  const { lang, t } = useI18n();

  return (
    <select
      aria-label={t("language")}
      value={lang}
      title={UI_LANGUAGE_LABELS[lang]}
      onChange={(event) => {
        const next = event.target.value as UiLanguage;
        setUiLanguage(next);
        writePrefs(storage, { uiLang: next });
      }}
      className="min-h-9 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700"
    >
      {UI_LANGUAGES.map((code) => (
        <option key={code} value={code}>
          {UI_LANGUAGE_LABELS[code]}
        </option>
      ))}
    </select>
  );
}
