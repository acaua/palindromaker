import { Schema } from "@tiptap/pm/model";

// The minimal ProseMirror schema every node-level test builds documents on:
// a doc of paragraphs of text, plus a blockquote for the block-separator
// cases. Kept here so the shape has one owner rather than a copy per test.
export const testSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    blockquote: { group: "block", content: "block+" },
    paragraph: { group: "block", content: "text*" },
    text: { group: "inline" },
  },
});

// a doc of paragraphs, one per "\n"-separated line: the block shape every
// node-level test starts from
export const buildDoc = (text: string) =>
  testSchema.node(
    "doc",
    null,
    text
      .split("\n")
      .map((paragraph) =>
        testSchema.node("paragraph", null, paragraph ? [testSchema.text(paragraph)] : []),
      ),
  );
