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

// the colors the editor highlights characters with, listed under the card
// (gray-500 rather than the mockup's gray-400: the legend must pass the
// color-contrast audit on the paper background)
export function EditorLegend() {
  const { t } = useI18n();
  return (
    <footer
      aria-label={t("legend.editorAria")}
      className="mt-5 flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-xs text-gray-500"
    >
      <span className={item}>
        <span aria-hidden="true" className={`${swatch} bg-blue-200`} />
        {t("legend.center")}
      </span>
      <span className={item}>
        <span aria-hidden="true" className={`${swatch} bg-red-300`} />
        {t("legend.breaks")}
      </span>
      <span className={item}>
        <span aria-hidden="true" className={`${swatch} bg-purple-400`} />
        {t("legend.caretMirror")}
      </span>
    </footer>
  );
}
