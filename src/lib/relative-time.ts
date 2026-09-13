import { UI_LANGUAGE_LOCALES } from "@/lib/i18n";
import type { UiLanguage } from "@/lib/i18n";

const UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

const formatters = new Map<UiLanguage, Intl.RelativeTimeFormat>();
const formatterFor = (lang: UiLanguage): Intl.RelativeTimeFormat => {
  let formatter = formatters.get(lang);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(UI_LANGUAGE_LOCALES[lang], { numeric: "auto" });
    formatters.set(lang, formatter);
  }
  return formatter;
};

// "2 days ago" / "há 2 dias"; "" when the timestamp is not a real date
export const formatRelativeTime = (iso: string, lang: UiLanguage, now = Date.now()): string => {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const seconds = Math.round((time - now) / 1000);
  const formatter = formatterFor(lang);
  for (const [unit, span] of UNITS) {
    if (Math.abs(seconds) >= span) return formatter.format(Math.round(seconds / span), unit);
  }
  return formatter.format(seconds, "second");
};
