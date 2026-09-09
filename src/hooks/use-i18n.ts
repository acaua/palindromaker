import { useCallback, useSyncExternalStore } from "react";

import { getUiLanguage, subscribeUiLanguage, translate } from "@/lib/i18n";
import type { MessageKey, UiLanguage } from "@/lib/i18n";

export type Translate = (
  key: MessageKey,
  vars?: Record<string, string>,
) => string;

// the UI language and its translator, shared by every component; the
// language switch re-renders consumers through the module store
export function useI18n(): { lang: UiLanguage; t: Translate } {
  const lang = useSyncExternalStore(subscribeUiLanguage, getUiLanguage);
  const t = useCallback<Translate>(
    (key, vars) => translate(lang, key, vars),
    [lang],
  );
  return { lang, t };
}
