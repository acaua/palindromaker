import type { JSONContent } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";

import { getUiLanguage } from "@/lib/i18n";
import type { UiLanguage } from "@/lib/i18n";
import { readStoredDoc } from "@/lib/persistence";
import { sampleContent } from "@/lib/sample";
import { readShareText, textToDoc } from "@/lib/share-link";
import type { StorageLike } from "@/lib/storage";

// What the editor opens with, from the one place that knows the
// precedence: a shared #t= fragment wins over the stored doc, which wins
// over the sample. Reading stays injectable (fragment, storage, schema) so
// the rules are testable without a browser; `uiLanguage` only picks the
// sample.
export const resolveInitialContent = ({
  fragment,
  storage,
  schema,
  uiLanguage = getUiLanguage(),
}: {
  fragment: string;
  storage: StorageLike | null;
  schema: Schema;
  uiLanguage?: UiLanguage;
}): JSONContent | string => {
  const shared = readShareText(fragment);
  return shared ? textToDoc(shared) : (readStoredDoc(storage, schema) ?? sampleContent(uiLanguage));
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
