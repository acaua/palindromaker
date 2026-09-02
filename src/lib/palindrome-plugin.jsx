import { useCallback } from "react";
import { Editor, Node, Point } from "slate";
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

  const mirror = palindrome.mirror.map((pos, i) => {
    return [positions[i], positions[pos]];
  });

  return {
    isPalindrome: palindrome.isPalindrome,
    center,
    mirror,
  };
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

      if (editor.selection) {
        const mirror = editor.palindrome.mirror.find((el) => {
          return el && Point.equals(el[0], editor.selection.anchor);
        });

        if (mirror) {
          ranges.push({
            anchor: mirror[1],
            focus: Editor.after(editor, mirror[1]) || mirror[1],
            mirror: true,
          });

          ranges.push({
            anchor: editor.selection.anchor,
            focus:
              Editor.after(editor, editor.selection.anchor) ||
              editor.selection.anchor,
            self: true,
          });
        }
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
    leaf.center1 || leaf.center2 ? "bg-blue-200" : "",
    leaf.gap ? "bg-red-300" : "",
    leaf.self ? "bg-purple-200" : "",
    leaf.mirror ? "bg-purple-400" : "",
  ].join(" ");

  if (leaf.center1 || leaf.center2) {
    return (
      <span {...attributes} className={className}>
        {leaf.center2 && (
          <span className="relative">
            <span className="absolute top-[-4px] bottom-[-4px] left-0 w-2 border-t-4 border-b-4 border-blue-500" />
          </span>
        )}
        {children}
        {leaf.center1 && (
          <span className="relative">
            <span className="absolute top-[-4px] bottom-[-4px] right-0 w-2 border-t-4 border-b-4 border-blue-500" />
          </span>
        )}
      </span>
    );
  }

  return (
    <span {...attributes} className={className}>
      {children}
    </span>
  );
};
