import { useEffect, useState } from "react";
import { RouterProvider } from "@tanstack/react-router";

import { router } from "@/router";
import { useI18n } from "@/hooks/use-i18n";
import { initUiLanguage, UI_LANGUAGE_TAGS } from "@/lib/i18n";
import { localStorageOrNull, readStoredPrefs } from "@/lib/persistence";

// a thin shell: language bootstrap, then the routed app. Everything that
// was page content lives in src/components/editor-page.tsx (home) and the
// other routes; the header lives in src/components/site-header.tsx.
export default function App() {
  const storage = localStorageOrNull();
  // prefs are read once, like the editor's restored content
  const [restored] = useState(() => readStoredPrefs(storage));
  // once per page load: the stored UI language, else the browser's
  initUiLanguage(restored.uiLang);
  const { lang } = useI18n();
  // screen readers announce per the document language, not the UI's
  useEffect(() => {
    document.documentElement.lang = UI_LANGUAGE_TAGS[lang];
  }, [lang]);

  return <RouterProvider router={router} />;
}
