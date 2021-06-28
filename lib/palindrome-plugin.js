import { Editor, Node } from "slate";
import { Editable } from "slate-react";
import { useCallback } from "react";

import checkPalindrome from "@/lib/check-palindrome";

export const withPalindrome = (editor) => {
  const { onChange } = editor;

  editor.palindrome = {
    isPalindrome: false,
    center: undefined,
  };

  editor.onChange = () => {
    const textNodes = [...Node.texts(editor)];
    const texts = textNodes.map((node) => node[0].text);
    const text = texts.join("\n");

    const start = Editor.start(editor, []);
    const end = Editor.end(editor, [textNodes.length - 1]);
    const positions = [
      ...Editor.positions(editor, { at: { anchor: start, focus: end } }),
    ];

    const palindorme = checkPalindrome(text);

    const center = palindorme.center.map((pos) =>
      pos ? positions[pos] : undefined
    );

    editor.palindrome = { isPalindrome: palindorme.isPalindrome, center };

    onChange();
  };

  return editor;
};

export const EditablePalindrome = ({ editor }) => {
  const decorate = useCallback(
    ([node, path]) => {
      let ranges = [];

      if (
        editor.palindrome &&
        editor.palindrome.center &&
        Editor.isEditor(node)
      ) {
        const [pos1, pos2] = editor.palindrome.center;

        if (pos1)
          ranges.push({
            anchor: pos1,
            focus: Editor.after(editor, pos1),
            center1: true,
          });

        if (pos2)
          ranges.push({
            anchor: pos2,
            focus: Editor.after(editor, pos2),
            center2: true,
          });
      }

      return ranges;
    },
    [editor]
  );

  return (
    <Editable decorate={decorate} renderLeaf={(props) => <Leaf {...props} />} />
  );
};

const Leaf = ({ attributes, children, leaf }) => {
  const className = [
    leaf.center1 ? "bg-red-200 border-r border-black" : "",
    leaf.center2 ? "bg-red-200 border-l border-black" : "",
  ].join(" ");
  return (
    <span {...attributes} className={className}>
      {children}
    </span>
  );
};
