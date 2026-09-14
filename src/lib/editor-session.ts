import type { JSONContent } from "@tiptap/core";

import { getUiLanguage } from "@/lib/i18n";
import type { UiLanguage } from "@/lib/i18n";
import { readStoredDoc } from "@/lib/persistence";
import type { StoreContext } from "@/lib/persistence";
import { initPrefs } from "@/lib/prefs-store";
import { sampleContent } from "@/lib/sample";
import { readShareText, textToDoc } from "@/lib/share-link";

// What the editor opens with, from the one place that knows the
// precedence: a shared #t= fragment wins over the stored doc, which wins
// over the sample. Reading stays injectable (fragment plus the store
// context) so the rules are testable without a browser; `uiLanguage`
// only picks the sample.
export const resolveInitialContent = ({
  fragment,
  storage,
  schema,
  uiLanguage = getUiLanguage(),
}: {
  fragment: string;
  uiLanguage?: UiLanguage;
} & StoreContext): JSONContent | string => {
  const shared = readShareText(fragment);
  return shared ? textToDoc(shared) : (readStoredDoc(storage, schema) ?? sampleContent(uiLanguage));
};

// Everything the editor is seeded with at mount, resolved once: the initial
// content (the same precedence as resolveInitialContent) and the two
// remembered toggles. The write path back is the shared prefs store
// (src/lib/prefs-store.ts); opening the session binds that store to the
// same storage, so reads and writes cannot disagree.
export interface EditorSession {
  content: JSONContent | string;
  mirrorEnabled: boolean;
  finderOpen: boolean;
}

export const openEditorSession = ({
  fragment,
  storage,
  schema,
  uiLanguage = getUiLanguage(),
}: {
  fragment: string;
  uiLanguage?: UiLanguage;
} & StoreContext): EditorSession => {
  const prefs = initPrefs(storage).read();
  return {
    content: resolveInitialContent({ fragment, storage, schema, uiLanguage }),
    mirrorEnabled: prefs.mirrorEnabled,
    finderOpen: prefs.finderOpen,
  };
};

interface LocationLike {
  hash: string;
  pathname: string;
  search: string;
}

interface HistoryLike {
  replaceState: (data: unknown, title: string, url: string) => void;
}

// Consume the share fragment once it has been read: without this, reloading
// after the reader's "Edit this" would load the shared text instead of
// whatever was edited and saved. replaceState (no history entry, no
// popstate, no scroll jump) keeps the switch invisible to the router. The
// two globals are parameters so the behaviour is testable.
export const clearShareFragment = (
  location: LocationLike = window.location,
  history: HistoryLike = window.history,
): void => {
  if (!location.hash) return;
  history.replaceState(null, "", location.pathname + location.search);
};
