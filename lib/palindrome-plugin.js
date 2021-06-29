import { useCallback } from "react";
import { Editor, Node } from "slate";
import { Editable } from "slate-react";

import checkPalindromeBase from "@/lib/check-palindrome";

export const withPalindrome = (editor) => {
  const { onChange } = editor;

  editor.palindrome = {
    isPalindrome: false,
    center: undefined,
  };

  editor.onChange = () => {
    editor.palindrome = checkPalindrome(editor);

    onChange();
  };

  return editor;
};

const checkPalindrome = (editor) => {
  const textNodes = [...Node.texts(editor)];
  const texts = textNodes.map((node) => node[0].text);
  const text = texts.join("\n");

  const start = Editor.start(editor, []);
  const end = Editor.end(editor, [textNodes.length - 1]);
  const positions = [
    ...Editor.positions(editor, { at: { anchor: start, focus: end } }),
  ];

  const palindrome = checkPalindromeBase(text);

  const center = !!palindrome.center
    ? palindrome.center.map((pos) => positions[pos])
    : undefined;

  return { isPalindrome: palindrome.isPalindrome, center };
};

export const EditablePalindrome = ({ editor, ...props }) => {
  const decorate = useCallback(
    ([node, path]) => {
      let ranges = [];

      const { palindrome } = editor;

      if (!Editor.isEditor(node)) return ranges;

      if (palindrome.center) {
        const [pos1, pos2] = palindrome.center;

        if (pos1) {
          ranges.push({
            anchor: pos1,
            focus: Editor.after(editor, pos1) || pos1,
            center1: true,
          });
        }
        if (pos2)
          ranges.push({
            anchor: pos2,
            focus: Editor.after(editor, pos2) || pos2,
            center2: true,
          });
      }

      if (!palindrome.isPalindrome && palindrome.center) {
        ranges.push({
          anchor:
            Editor.after(editor, palindrome.center[0]) || palindrome.center[0],
          focus: palindrome.center[1],
          gap: true,
        });
      }

      return ranges;
    },
    [editor]
  );

  return (
    <Editable
      {...props}
      decorate={decorate}
      renderLeaf={(props) => <Leaf {...props} />}
    />
  );
};

const Leaf = ({ attributes, children, leaf }) => {
  const className = [
    leaf.center1 ? "bg-blue-300 border-r border-black" : "",
    leaf.center2 ? "bg-blue-300 border-l border-black" : "",
    leaf.gap ? "bg-red-300" : "",
  ].join(" ");
  return (
    <span {...attributes} className={className}>
      {children}
    </span>
  );
};
