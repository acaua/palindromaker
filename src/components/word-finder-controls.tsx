import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";

import { useI18n } from "@/hooks/use-i18n";
import type { Language, SearchMode } from "@/lib/dictionary";
import { LANGUAGES } from "@/lib/dictionary";
import type { MessageKey } from "@/lib/i18n";

const modeKeys: Array<{ value: SearchMode; key: MessageKey }> = [
  { value: "starts", key: "finder.startsWith" },
  { value: "ends", key: "finder.endsWith" },
  { value: "contains", key: "finder.contains" },
];

// what to search for: the letters, the dictionary, and where to match
export default function WordFinderControls({
  query,
  onQueryChange,
  language,
  onLanguageChange,
  mode,
  onModeChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3 px-4 pb-4">
      <label className="relative block">
        <span className="sr-only">{t("finder.searchSr")}</span>
        <MagnifyingGlassIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-3 left-3 h-5 w-5 text-gray-400"
        />
        <input
          type="text"
          aria-label={t("finder.searchAria")}
          placeholder={t("finder.searchPlaceholder")}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="min-h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-white py-2 pr-3 pl-10 font-mono text-base text-gray-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
          {t("language")}
          <select
            aria-label={t("finder.languageAria")}
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value as Language)
            }
            className="min-h-10 cursor-pointer rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700"
          >
            {LANGUAGES.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        className="grid grid-cols-3 rounded-lg bg-gray-200/70 p-1"
        aria-label={t("finder.matchPosition")}
      >
        {modeKeys.map(({ value, key }) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => onModeChange(value)}
            className={`min-h-9 cursor-pointer rounded-md px-2 py-1 text-xs font-medium transition ${
              mode === value
                ? "bg-white text-violet-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t(key)}
          </button>
        ))}
      </div>
    </div>
  );
}
