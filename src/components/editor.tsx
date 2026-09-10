import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";

import { wordInsertMode } from "@/lib/mirror-extension";
import { extensions, schema } from "@/lib/editor-schema";
import { getUiLanguage, translate } from "@/lib/i18n";
import {
  createPersistence,
  localStorageOrNull,
  readStoredDoc,
  readStoredPrefs,
  writePrefs,
} from "@/lib/persistence";
import type { ConflictChoice, Persistence } from "@/lib/persistence";
import { sampleContent } from "@/lib/sample";
import { readShareText, textToDoc } from "@/lib/share-link";
import ConflictNotice from "@/components/conflict-notice";
import { EditorLegend } from "@/components/legend";
import StatusBar from "@/components/status-bar";
import WordFinder from "@/components/word-finder";

export default function Editor({
  finderOpen,
  onToggleFinder,
  onCloseFinder,
  triggerRef,
}: {
  finderOpen: boolean;
  onToggleFinder: () => void;
  onCloseFinder: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const storage = localStorageOrNull();
  // the editor keeps the content and the toggle state it was created with,
  // so storage is read once: re-reading every render would re-validate the
  // stored doc against the schema on every keystroke. The UI language is
  // also mount-time: App has run initUiLanguage by now, and the editor is
  // never recreated, so switching the language mid-session cannot reseed it
  const [restored] = useState(() => {
    // a shared #t= fragment wins over the stored doc: the /p reader's
    // "Edit this" lands here carrying one, and editing that shared
    // palindrome replaces the local doc on the first edit — the hash
    // content is not saved until then (accepted trade-off; the conflict
    // rules that then govern saving live in persistence.ts)
    const shared = readShareText();
    return {
      content: shared
        ? textToDoc(shared)
        : (readStoredDoc(storage, schema) ?? sampleContent(getUiLanguage())),
      mirrorEnabled: readStoredPrefs(storage).mirrorEnabled ?? false,
    };
  });

  // consume the share fragment once it has been read: without this,
  // reloading after "Edit this" would load the shared text instead of
  // whatever was edited and saved. replaceState (no history entry, no
  // popstate, no scroll jump) keeps the switch invisible to the router
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  const editor = useEditor({
    extensions: extensions({
      enabled: restored.mirrorEnabled,
      onChange: (enabled) => writePrefs(storage, { mirrorEnabled: enabled }),
    }),
    content: restored.content,
    autofocus: "end",
    editorProps: {
      attributes: {
        "aria-label": translate(getUiLanguage(), "editor.ariaLabel"),
        "aria-multiline": "true",
        role: "textbox",
        // a palindrome is misspelled by definition: the squiggles would
        // underline the whole document and fight the gap highlight
        spellcheck: "false",
        class: [
          "min-h-32 p-6 pb-5 outline-none md:min-h-40 md:p-10 md:pb-8",
          "font-mono text-base leading-7 tracking-wide text-gray-900",
          "md:text-xl md:leading-10",
        ].join(" "),
      },
    },
  });

  // what clicking a word in the finder will do. The selector returns the
  // answer rather than the state it is derived from, so keystrokes that
  // leave it unchanged never re-render the finder and its result list.
  const insertMode = useEditorState({
    editor,
    selector: ({ editor }) => (editor ? wordInsertMode(editor.state) : "caret"),
  });

  const insertWord = useCallback(
    (word: string) => {
      editor?.chain().insertWord(word).focus().run();
    },
    [editor],
  );

  // another tab saved a different palindrome while this one had edits of
  // its own; until the user answers, this tab holds off on saving
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
  }, [editor, storage]);

  const resolveConflict = useCallback((choice: ConflictChoice) => {
    persistenceRef.current?.resolveConflict(choice);
    setConflict(false);
  }, []);

  if (!editor) return null;

  return (
    <>
      <div className="mt-5 overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_20px_50px_-20px_rgba(0,0,0,0.18)] md:mt-8">
        {conflict && <ConflictNotice onResolve={resolveConflict} />}
        <EditorContent editor={editor} />
        <StatusBar
          editor={editor}
          finderOpen={finderOpen}
          onToggleFinder={onToggleFinder}
          triggerRef={triggerRef}
        />
      </div>
      <EditorLegend />
      <WordFinder
        open={finderOpen}
        onClose={onCloseFinder}
        onInsertWord={insertWord}
        insertMode={insertMode ?? "caret"}
      />
    </>
  );
}
