import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";

import type { Language, SearchMode } from "@/lib/dictionary";
import { LANGUAGES } from "@/lib/dictionary";

const modes: Array<{ value: SearchMode; label: string }> = [
  { value: "starts", label: "starts with" },
  { value: "ends", label: "ends with" },
  { value: "contains", label: "contains" },
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
  return (
    <div className="space-y-3 px-4 pb-4">
      <label className="relative block">
        <span className="sr-only">Search words</span>
        <MagnifyingGlassIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-3 left-3 h-5 w-5 text-gray-400"
        />
        <input
          type="text"
          aria-label="search words"
          placeholder="Search words…"
          autoFocus
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="min-h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-white py-2 pr-3 pl-10 font-mono text-base text-gray-900 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
          Language
          <select
            aria-label="dictionary language"
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
        aria-label="match position"
      >
        {modes.map(({ value, label }) => (
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
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
