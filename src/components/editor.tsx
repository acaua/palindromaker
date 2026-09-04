import { useEffect } from "react";
import { getSchema } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { Palindrome } from "@/lib/palindrome-extension";
import { mirrorPluginKey, MirrorEditing } from "@/lib/mirror-extension";
import {
  createPersistence,
  DOC_STORAGE_KEY,
  readStoredDoc,
  readStoredPrefs,
} from "@/lib/persistence";
import Legend from "@/components/legend";
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

const extensions = [
  StarterKit.configure(disabledStarterKitExtensions),
  Palindrome,
  MirrorEditing,
];

// lets readStoredDoc reject stored docs this editor cannot represent;
// without it, corrupt localStorage would crash nodeFromJSON during render
const schema = getSchema(extensions);

export default function Editor() {
  const editor = useEditor({
    extensions,
    content:
      readStoredDoc(localStorage, DOC_STORAGE_KEY, schema) ??
      "Eva, can I stab bats in a cave?",
    autofocus: "end",
    editorProps: {
      attributes: {
        "aria-label": "Palindrome editor",
        "aria-multiline": "true",
        role: "textbox",
        class: [
          "min-h-[360px] p-5 outline-none lg:min-h-[500px]",
          "font-mono text-lg leading-8 tracking-wide text-gray-900 sm:text-xl",
        ].join(" "),
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    // restore the mirror toggle from the previous session; the guard keeps
    // it idempotent if React runs this effect again on a fresh editor
    if (
      readStoredPrefs(localStorage).mirrorEnabled &&
      !mirrorPluginKey.getState(editor.state)?.enabled
    ) {
      editor.commands.toggleMirrorEditing();
    }
    return createPersistence(editor, { storage: localStorage });
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="flex min-w-0 flex-col" aria-label="writing studio">
          <Toolbar editor={editor} />
          <EditorContent editor={editor} className="flex-1" />
          <Legend variant="editor" />
        </section>
        <WordFinder />
      </div>
    </div>
  );
}
