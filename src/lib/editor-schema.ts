import { Extension, getSchema } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";

import { MirrorEditing } from "@/lib/mirror-extension";
import type { MirrorEditingOptions } from "@/lib/mirror-extension";
import { Palindrome } from "@/lib/palindrome-extension";

// the one restricted TipTap vocabulary: every surface that shows a
// palindrome — the editor (src/components/editor.tsx), the read-only
// reader (src/components/reader.tsx), and the schema persistence
// validates stored docs against — must speak it. StarterKit with most
// extensions disabled: paragraphs and text only, so mirror typing, the
// palindrome checker and the share round-trip never meet a node or mark
// the palindrome logic cannot mirror.
export const disabledStarterKitExtensions = {
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

export const extensions = (mirror: Partial<MirrorEditingOptions>) => [
  StarterKit.configure(disabledStarterKitExtensions),
  Palindrome,
  MirrorEditing.configure(mirror),
];

// the reader's last line of defence at the state level: every
// doc-changing transaction is dropped, so no event-level gap (an IME's
// non-cancelable composition commit, for instance) can rewrite shared
// text — selection-only transactions pass, which is what caret
// navigation needs
const ReadOnlyContent = Extension.create({
  name: "readOnlyContent",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        filterTransaction: (transaction) => !transaction.docChanged,
      }),
    ];
  },
});

// the read-only reader's list: the same restricted StarterKit plus
// Palindrome, without MirrorEditing — nothing can be typed there, and
// the shared schema is pinned by editor-schema.test.ts
export const readerExtensions = () => [
  ReadOnlyContent,
  StarterKit.configure(disabledStarterKitExtensions),
  Palindrome,
];

// lets readStoredDoc reject stored docs this editor cannot represent;
// without it, corrupt localStorage would crash nodeFromJSON during render.
// The mirror options play no part in the schema.
export const schema = getSchema(extensions({}));
