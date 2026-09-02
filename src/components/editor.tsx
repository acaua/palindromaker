import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { Palindrome } from "@/lib/palindrome-extension";
import { MirrorEditing } from "@/lib/mirror-extension";
import Toolbar from "@/components/toolbar";

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

export default function Editor() {
  const editor = useEditor({
    extensions: [
      StarterKit.configure(disabledStarterKitExtensions),
      Palindrome,
      MirrorEditing,
    ],
    content: "Eva, can I stab bats in a cave?",
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

  if (!editor) return null;

  return (
    <div className="max-w-prose bg-white shadow">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
