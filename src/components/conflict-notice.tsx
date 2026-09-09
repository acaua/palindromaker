import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

import { useI18n } from "@/hooks/use-i18n";
import type { ConflictChoice } from "@/lib/persistence";

// Shown when another tab saved a different palindrome while this tab had
// edits of its own. Until the question is answered this tab stops saving,
// so neither version is lost while the user decides.
export default function ConflictNotice({
  onResolve,
}: {
  onResolve: (choice: ConflictChoice) => void;
}) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <ExclamationTriangleIcon
        aria-hidden="true"
        className="h-5 w-5 shrink-0 text-amber-700"
      />
      <span className="min-w-0 flex-1">{t("conflict.message")}</span>
      <span className="flex gap-2">
        <button
          type="button"
          onClick={() => onResolve("theirs")}
          className="min-h-9 cursor-pointer rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium text-amber-900 transition hover:bg-amber-100"
        >
          {t("conflict.loadTheirs")}
        </button>
        <button
          type="button"
          onClick={() => onResolve("mine")}
          className="min-h-9 cursor-pointer rounded-lg border border-transparent bg-amber-700 px-3 py-1.5 font-medium text-white transition hover:bg-amber-800"
        >
          {t("conflict.keepMine")}
        </button>
      </span>
    </div>
  );
}
