import type { ReactNode } from "react";

import { MIRROR_MATCH_MARKERS, MIRROR_MATCH_ORDER } from "@/components/mirror-match-markers";
import { useI18n } from "@/hooks/use-i18n";

const item = "flex items-center gap-1.5";
const swatch = "inline-block h-3 w-3 shrink-0 rounded-sm";
const icon = "h-3 w-3 shrink-0";

// the markers the word finder puts next to each result
export function FinderLegend() {
  const { t } = useI18n();
  return (
    <footer
      aria-label={t("finder.legendAria")}
      className="flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 px-4 py-3 text-xs text-gray-500"
    >
      {MIRROR_MATCH_ORDER.map((match) => {
        const { Icon, className, key } = MIRROR_MATCH_MARKERS[match];
        return (
          <span key={match} className={item}>
            <Icon aria-hidden="true" className={`${icon} ${className}`} />
            {t(key)}
          </span>
        );
      })}
    </footer>
  );
}

const LegendRow = ({ swatchClass, children }: { swatchClass: string; children: ReactNode }) => (
  <span className={item}>
    <span aria-hidden="true" className={`${swatch} ${swatchClass}`} />
    {children}
  </span>
);

// The colors a palindrome surface highlights characters with, listed under the
// card (gray-500 rather than the mockup's gray-400: the legend must pass the
// color-contrast audit on the paper background). The center and gap rows are
// shared; only the third row's wording and aria-label differ between the editor
// and the reader.
function ColorLegend({ ariaLabel, mirrorLabel }: { ariaLabel: string; mirrorLabel: string }) {
  const { t } = useI18n();
  return (
    <footer
      aria-label={ariaLabel}
      className="mt-5 flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-xs text-gray-500"
    >
      <LegendRow swatchClass="bg-blue-200">{t("legend.center")}</LegendRow>
      <LegendRow swatchClass="bg-red-300">{t("legend.breaks")}</LegendRow>
      <LegendRow swatchClass="bg-purple-400">{mirrorLabel}</LegendRow>
    </footer>
  );
}

export function EditorLegend() {
  const { t } = useI18n();
  return <ColorLegend ariaLabel={t("legend.editorAria")} mirrorLabel={t("legend.caretMirror")} />;
}

// the reader's legend: the purple row is a tap-selected mirror pair, not a
// caret — there is no caret in the reader
export function ReaderLegend() {
  const { t } = useI18n();
  return <ColorLegend ariaLabel={t("reader.legendAria")} mirrorLabel={t("reader.legendMirror")} />;
}
