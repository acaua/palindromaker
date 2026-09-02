import { useCallback } from "react";
import type { ComponentProps } from "react";
import { Editor, Node, Point } from "slate";
import type { NodeEntry, Range } from "slate";
import type { RenderLeafProps } from "slate-react";
import { Editable } from "slate-react";

import checkPalindromeBase from "@/lib/check-palindrome";

export const withPalindrome = (editor: Editor): Editor => {
  const { onChange } = editor;

  editor.palindrome = {
    isPalindrome: false,
    center: undefined,
    mirror: [],
  };

  editor.onChange = () => {
    editor.palindrome = checkPalindrome(editor);

    onChange();
  };

  return editor;
};

const checkPalindrome = (editor: Editor) => {
  const textNodes = [...Node.texts(editor)];
  const texts = textNodes.map((node) => node[0].text);
  const text = texts.join("\n");

  // map every character of `text` to its Point in the document;
  // the "\n" join characters have no document position
  const positions: Array<Point | undefined> = [];
  textNodes.forEach(([node, path], i) => {
    if (i > 0) positions.push(undefined);
    for (let offset = 0; offset < node.text.length; offset++) {
      positions.push({ path, offset });
    }
  });

  const palindrome = checkPalindromeBase(text);

  const center = palindrome.center
    ? palindrome.center.map((pos) => positions[pos])
    : undefined;

  const mirror = palindrome.mirror.map((pos, i) => {
    const from = positions[i];
    const to = pos === undefined ? undefined : positions[pos];
    return from && to ? ([from, to] as [Point, Point]) : undefined;
  });

  return {
    isPalindrome: palindrome.isPalindrome,
    center,
    mirror,
  };
};

type EditableProps = ComponentProps<typeof Editable>;

type EditablePalindromeProps = Omit<
  EditableProps,
  "decorate" | "renderLeaf"
> & {
  editor: Editor;
};

export const EditablePalindrome = ({
  editor,
  ...props
}: EditablePalindromeProps) => {
  const decorate = useCallback(
    ([node]: NodeEntry): Range[] => {
      const ranges: Range[] = [];

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
        const [gapStart, gapEnd] = palindrome.center;

        if (gapStart && gapEnd) {
          ranges.push({
            anchor: Editor.after(editor, gapStart) || gapStart,
            focus: gapEnd,
            gap: true,
          });
        }
      }

      const { selection } = editor;

      if (selection) {
        const mirror = palindrome.mirror.find((el) => {
          return el && Point.equals(el[0], selection.anchor);
        });

        if (mirror) {
          ranges.push({
            anchor: mirror[1],
            focus: Editor.after(editor, mirror[1]) || mirror[1],
            mirror: true,
          });

          ranges.push({
            anchor: selection.anchor,
            focus: Editor.after(editor, selection.anchor) || selection.anchor,
            self: true,
          });
        }
      }

      return ranges;
    },
    [editor],
  );

  return (
    <Editable
      {...props}
      decorate={decorate}
      renderLeaf={(props) => <Leaf {...props} />}
    />
  );
};

const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
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
