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
