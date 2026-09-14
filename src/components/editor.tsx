import { useCallback } from "react";
import type { RefObject } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";

import { EMPTY_FACTS, editorFacts } from "@/lib/editor-facts";
import { extensions, schema } from "@/lib/editor-schema";
import type { EditorSession } from "@/lib/editor-session";
import { getUiLanguage, translate } from "@/lib/i18n";
import { mirrorEnabled } from "@/lib/mirror-extension";
import { prefsStore } from "@/lib/prefs-store";
import { DEFAULT_WORD_INSERT_MODE, wordInsertMode } from "@/lib/word-insert";
import { localStorageOrNull } from "@/lib/storage";
import { useEditorPersistence } from "@/hooks/use-editor-persistence";
import ConflictNotice from "@/components/conflict-notice";
import { EditorLegend } from "@/components/legend";
import StatusBar from "@/components/status-bar";
import WordFinder from "@/components/word-finder";

// the finder disclosure, owned by the page (which reads `open` for its
// layout reservation) and handed to the editor as one prop; the editor
// forwards it to the status bar's trigger and the panel
export interface FinderHandle {
  open: boolean;
  toggle: () => void;
  close: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

// The TipTap view. It is seeded from the one EditorSession the page
// resolved, so it never parses storage or prefs itself; the UI language is
// mount-time too, since App has run initUiLanguage by now and the editor is
// never recreated. Toggle writes go through the shared prefs store.
export default function Editor({
  session,
  finder,
}: {
  session: EditorSession;
  finder: FinderHandle;
}) {
  const editor = useEditor({
    extensions: extensions({
      enabled: session.mirrorEnabled,
      onChange: (enabled) => prefsStore().write({ mirrorEnabled: enabled }),
    }),
    content: session.content,
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
    selector: ({ editor }) =>
      editor ? wordInsertMode(editor.state, mirrorEnabled(editor.state)) : DEFAULT_WORD_INSERT_MODE,
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
  const storage = localStorageOrNull();
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
          finderOpen={finder.open}
          onToggleFinder={finder.toggle}
          triggerRef={finder.triggerRef}
        />
      </div>
      <EditorLegend />
      <WordFinder
        open={finder.open}
        onClose={finder.close}
        onInsertWord={insertWord}
        insertMode={insertMode ?? DEFAULT_WORD_INSERT_MODE}
      />
    </>
  );
}
