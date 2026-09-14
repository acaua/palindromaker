import { useCallback, useEffect, useRef, useState } from "react";

import { createPersistence } from "@/lib/persistence";
import type {
  ConflictChoice,
  Persistence,
  PersistenceEditor,
  StoreContext,
} from "@/lib/persistence";

// Ties doc persistence to the editor's lifetime and turns the cross-tab
// conflict into component state. `editor` is the only live dependency;
// the store context is injected like everywhere else, so the hook is
// testable with a stub editor.
export const useEditorPersistence = (
  editor: PersistenceEditor | null,
  { storage, schema }: StoreContext,
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
