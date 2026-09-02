import { useState, useMemo, useEffect } from "react";

import { createEditor } from "slate";
import { Slate, withReact, ReactEditor } from "slate-react";
import { withHistory } from "slate-history";

import { withPalindrome, EditablePalindrome } from "@/lib/palindrome-plugin";
import Toolbar from "@/components/toolbar";

export default function Editor() {
  const editor = useMemo(
    () => withPalindrome(withReact(withHistory(createEditor()))),
    []
  );
  const [value, setValue] = useState([
    {
      type: "paragraph",
      // children: [{ text: "" }],
      children: [{ text: "Eva, can I stab bats in a cave?" }],
      // children: [{ text: "A man, a plan, a canal: Panama!" }],
    },
  ]);

  // Run once on first render to initialize stuff
  useEffect(() => {
    editor.onChange();
    // set value to new array to force rerender
    setValue([...value]);

    setInterval(() => {
      ReactEditor.focus(editor);
    }, 10);
  }, []);

  return (
    <Slate
      editor={editor}
      value={value}
      onChange={(newValue) => setValue(newValue)}
    >
      <div className="max-w-prose bg-white shadow">
        <Toolbar isPalindrome={editor.palindrome.isPalindrome} />
        <EditablePalindrome
          className={[
            "p-2",
            "font-mono text-lg tracking-wide text-gray-900",
            "my-2 min-h-[300px]",
          ].join(" ")}
          editor={editor}
        />
      </div>
    </Slate>
  );
}
