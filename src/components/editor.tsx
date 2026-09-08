import { useCallback, useEffect, useRef, useState } from "react";
import { getSchema } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { Palindrome } from "@/lib/palindrome-extension";
import { MirrorEditing } from "@/lib/mirror-extension";
import type { MirrorEditingOptions } from "@/lib/mirror-extension";
import {
  createPersistence,
  localStorageOrNull,
  readStoredDoc,
  readStoredPrefs,
  writePrefs,
} from "@/lib/persistence";
import type { ConflictChoice, Persistence } from "@/lib/persistence";
import { SAMPLE_CONTENT } from "@/lib/sample";
import ConflictNotice from "@/components/conflict-notice";
import { EditorLegend } from "@/components/legend";
import Toolbar from "@/components/toolbar";
import WordFinder from "@/components/word-finder";

const disabledStarterKitExtensions = {
  blockquote: false,
  bold: false,
  bulletList: false,
  code: false,
  codeBlock: false,
  dropcursor: false,
  hardBreak: false,
  heading: false,
  horizontalRule: false,
  italic: false,
  link: false,
  listKeymap: false,
  listItem: false,
  orderedList: false,
  strike: false,
  trailingNode: false,
  underline: false,
} as const;

const extensions = (mirror: Partial<MirrorEditingOptions>) => [
  StarterKit.configure(disabledStarterKitExtensions),
  Palindrome,
  MirrorEditing.configure(mirror),
];

// lets readStoredDoc reject stored docs this editor cannot represent;
// without it, corrupt localStorage would crash nodeFromJSON during render.
// The mirror options play no part in the schema.
const schema = getSchema(extensions({}));

export default function Editor() {
  const storage = localStorageOrNull();
  // the editor keeps the content and the toggle state it was created with,
  // so storage is read once: re-reading every render would re-validate the
  // stored doc against the schema on every keystroke
  const [restored] = useState(() => ({
    content: readStoredDoc(storage, schema) ?? SAMPLE_CONTENT,
    mirrorEnabled: readStoredPrefs(storage).mirrorEnabled ?? false,
  }));

  const editor = useEditor({
    extensions: extensions({
      enabled: restored.mirrorEnabled,
      onChange: (enabled) => writePrefs(storage, { mirrorEnabled: enabled }),
    }),
    content: restored.content,
    autofocus: "end",
    editorProps: {
      attributes: {
        "aria-label": "Palindrome editor",
        "aria-multiline": "true",
        role: "textbox",
        // a palindrome is misspelled by definition: the squiggles would
        // underline the whole document and fight the gap highlight
        spellcheck: "false",
        class: [
          "min-h-[360px] p-5 outline-none lg:min-h-[500px]",
          "font-mono text-lg leading-8 tracking-wide text-gray-900 sm:text-xl",
        ].join(" "),
      },
    },
  });

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
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="flex min-w-0 flex-col" aria-label="writing studio">
          <Toolbar editor={editor} />
          {conflict && <ConflictNotice onResolve={resolveConflict} />}
          <EditorContent editor={editor} className="flex-1" />
          <EditorLegend />
        </section>
        <WordFinder />
      </div>
    </div>
  );
}
