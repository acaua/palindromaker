import { useEffect } from "react";
import { getSchema } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { Palindrome } from "@/lib/palindrome-extension";
import { MirrorEditing } from "@/lib/mirror-extension";
import {
  createPersistence,
  DOC_STORAGE_KEY,
  readStoredDoc,
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
        class: [
          "p-2",
          "font-mono text-lg tracking-wide text-gray-900",
          "my-2 min-h-[300px]",
        ].join(" "),
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    return createPersistence(editor, { storage: localStorage });
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="max-w-prose bg-white shadow">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <WordFinder />
      <Legend />
    </div>
  );
}
