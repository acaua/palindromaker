import { useCallback, useEffect, useRef, useState } from "react";
import type { Schema } from "@tiptap/pm/model";

import { createPersistence } from "@/lib/persistence";
import type { ConflictChoice, Persistence, PersistenceEditor } from "@/lib/persistence";
import type { StorageLike } from "@/lib/storage";

// Ties doc persistence to the editor's lifetime and turns the cross-tab
// conflict into component state. `editor` is the only live dependency;
// storage and schema are injected like everywhere else, so the hook is
// testable with a stub editor.
export const useEditorPersistence = (
  editor: PersistenceEditor | null,
  { storage, schema }: { storage: StorageLike | null; schema: Schema },
): { conflict: boolean; resolveConflict: (choice: ConflictChoice) => void } => {
  const [conflict, setConflict] = useState(false);
  const persistenceRef = useRef<Persistence | null>(null);

  useEffect(() => {
    if (!editor) return;
    const handle = createPersistence(editor, {
      storage,
      schema,
      onConflict: () => setConflict(true),
    });
    persistenceRef.current = handle;
    return () => {
      handle.detach();
      persistenceRef.current = null;
    };
  }, [editor, storage, schema]);

  const resolveConflict = useCallback((choice: ConflictChoice) => {
    persistenceRef.current?.resolveConflict(choice);
    setConflict(false);
  }, []);

  return { conflict, resolveConflict };
};
