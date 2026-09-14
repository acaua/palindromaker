import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";

import { EMPTY_FACTS, editorFacts } from "@/lib/editor-facts";
import { extensions, schema } from "@/lib/editor-schema";
import { clearShareFragment, resolveInitialContent } from "@/lib/editor-session";
import { getUiLanguage, translate } from "@/lib/i18n";
import { wordInsertMode } from "@/lib/mirror-extension";
import { DEFAULT_WORD_INSERT_MODE } from "@/lib/word-insert";
import { prefsFor } from "@/lib/prefs";
import { localStorageOrNull } from "@/lib/storage";
import { useEditorPersistence } from "@/hooks/use-editor-persistence";
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
  const prefs = prefsFor(storage);
  // the editor keeps the content and the toggle state it was created with,
  // so storage is read once: re-reading every render would re-validate the
  // stored doc against the schema on every keystroke. The content
  // precedence (shared #t= > stored > sample) lives in editor-session.ts;
  // the UI language is mount-time too, since App has run initUiLanguage by
  // now and the editor is never recreated
  const [restored] = useState(() => ({
    content: resolveInitialContent({ fragment: window.location.hash, storage, schema }),
    mirrorEnabled: prefs.read().mirrorEnabled,
  }));

  // the share fragment is consumed once it has been read, so a reload after
  // "Edit this" falls back to storage; editing a shared palindrome replaces
  // the stored doc on the first edit (accepted trade-off — the conflict
  // rules that then govern saving live in persistence.ts)
  useEffect(() => {
    clearShareFragment();
  }, []);

  const editor = useEditor({
    extensions: extensions({
      enabled: restored.mirrorEnabled,
      onChange: (enabled) => prefs.write({ mirrorEnabled: enabled }),
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

  // what clicking a word in the finder will do. The selector reads only the
  // mode — not the share fields — so keystrokes that leave it unchanged
  // never re-render the finder and its result list. The rule stays
  // single-owned in wordInsertMode, whose pre-mount answer is the default.
  const insertMode = useEditorState({
    editor,
    selector: ({ editor }) => (editor ? wordInsertMode(editor.state) : DEFAULT_WORD_INSERT_MODE),
  });

  // everything the footer shows, through the one EditorFacts interface
  const facts = useEditorState({
    editor,
    selector: ({ editor }) => (editor ? editorFacts(editor.state) : EMPTY_FACTS),
  });

  const insertWord = useCallback(
    (word: string) => {
      editor?.chain().insertWord(word).focus().run();
    },
    [editor],
  );

  const onToggleMirror = useCallback(() => {
    editor?.commands.toggleMirrorEditing();
  }, [editor]);

  // another tab saved a different palindrome while this one had edits of
  // its own; until the user answers, this tab holds off on saving
  const { conflict, resolveConflict } = useEditorPersistence(editor, { storage, schema });

  if (!editor) return null;
  // the selector's fallback covers only the pre-mount render
  const currentFacts = facts ?? editorFacts(editor.state);

  return (
    <>
      <div className="mt-5 overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_20px_50px_-20px_rgba(0,0,0,0.18)] md:mt-8">
        {conflict && <ConflictNotice onResolve={resolveConflict} />}
        <EditorContent editor={editor} />
        <StatusBar
          facts={currentFacts}
          origin={window.location.origin}
          onToggleMirror={onToggleMirror}
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
        insertMode={insertMode ?? DEFAULT_WORD_INSERT_MODE}
      />
    </>
  );
}
