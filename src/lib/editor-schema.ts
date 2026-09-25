import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

import { MirrorEditing } from "@/lib/mirror-extension";
import type { MirrorEditingOptions } from "@/lib/mirror-extension";
import { Palindrome } from "@/lib/palindrome-extension";

// the one restricted TipTap vocabulary every editing surface speaks: the
// editor (src/components/editor.tsx) and the schema persistence validates
// stored docs against. StarterKit with most extensions disabled: paragraphs
// and text only, so mirror editing, the palindrome checker and the share
// round-trip never meet a node or mark the palindrome logic cannot mirror.
// The /p reader no longer speaks it: it renders static semantic text and
// shares only the checker and the highlight classes.
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

// lets readStoredDoc reject stored docs this editor cannot represent;
// without it, corrupt localStorage would crash nodeFromJSON during render.
// The mirror options play no part in the schema.
export const schema = getSchema(extensions({}));
