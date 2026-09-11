import { useEffect, useRef } from "react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/solid";
import { Link } from "@tanstack/react-router";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";

import CopyButton from "@/components/copy-button";
import { EditorLegend } from "@/components/legend";
import { readerExtensions } from "@/lib/editor-schema";
import { useI18n } from "@/hooks/use-i18n";
import { textToDoc } from "@/lib/share-link";

// the read-only half of sharing: the same card and typography as the
// editor, the same center/gap highlights, and the purple caret/mirror
// pair still following the selection — but the content is immutable
// despite the editable surface. onReady exists so tests can reach the
// view and drive selection transactions (mouse selection is not reliable
// under happy-dom)
export default function Reader({
  text,
  onReady,
}: {
  text: string;
  onReady?: (editor: Editor) => void;
}) {
  const { t } = useI18n();
  const readyRef = useRef(onReady);
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  const editor = useEditor({
    extensions: readerExtensions(),
    content: textToDoc(text),
    // sets the ProseMirror (and DOM) selection at the end of the doc on
    // create, so arrow keys and the caret highlight work from the start
    autofocus: "end",
    editorProps: {
      // the view must be editable for ProseMirror's caret machinery to
      // run at all — its keydown handling is gated on view.editable and
      // browsers do not move a caret inside contenteditable="false"
      // either (both verified against PM 3) — so read-only-ness is
      // enforced in two places: here, claiming the cancellable mutation
      // paths (typing, paste, drop, cut) before the DOM moves; and at
      // the state level (`ReadOnlyContent` in editor-schema.ts), which
      // drops doc-changing transactions that slip through. The shared
      // text (state, Copy, reload) stays intact; an IME composition
      // commit — whose beforeinput is not cancelable in Chromium — can
      // still paint transiently into the DOM and relies on PM reverting
      // it from state on the next update. Arrows and text selection are
      // untouched.
      handleDOMEvents: {
        beforeinput: (_view, event) => {
          event.preventDefault();
          return true;
        },
        paste: (_view, event) => {
          event.preventDefault();
          return true;
        },
        drop: (_view, event) => {
          event.preventDefault();
          return true;
        },
      },
      attributes: {
        "aria-label": t("reader.ariaLabel"),
        // a bare aria-label is invisible to assistive tech without a
        // role; the view cannot be typed into, so it keeps the neutral
        // region role rather than a textbox
        role: "region",
        spellcheck: "false",
        class: [
          "min-h-32 p-6 pb-5 outline-none md:min-h-40 md:p-10 md:pb-8",
          "font-mono text-base leading-7 tracking-wide text-gray-900",
          "md:text-xl md:leading-10",
        ].join(" "),
      },
    },
  });

  // read-only keyboard navigation: view.focus() moves DOM focus (the
  // view is editable), which is what turns PM's native caret machinery on
  useEffect(() => {
    if (!editor) return;
    editor.view.focus();
    readyRef.current?.(editor);
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="m-auto w-full max-w-3xl">
      {/* the navigation focus target (router.tsx); sr-only, so the visible
          brand stays in the header */}
      <h1 tabIndex={-1} className="sr-only outline-none">
        {t("reader.title")}
      </h1>
      <p className="mt-2.5 max-w-xl text-sm leading-5 text-gray-600 md:mt-3 md:text-base md:leading-6">
        {t("reader.hint")}
      </p>
      <div className="mt-5 overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_20px_50px_-20px_rgba(0,0,0,0.18)] md:mt-8">
        <EditorContent editor={editor} />
        <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-gray-100 bg-gray-50/50 px-4 py-2.5 md:px-5">
          <CopyButton
            label={t("reader.copyText")}
            title={t("reader.copyText")}
            copiedLabel={t("share.copied")}
            icon={<ClipboardDocumentIcon aria-hidden="true" className="h-4 w-4 text-gray-500" />}
            getText={() => editor.getText({ blockSeparator: "\n" })}
          />
          {/* the silent replace: / takes the same #t= fragment as its
              initial content, and the first edit there replaces the local
              doc — accepted (see editor.tsx) */}
          <Link
            to="/"
            hash={`t=${encodeURIComponent(text)}`}
            className="rounded-lg px-2 py-1.5 text-sm font-medium text-violet-700 hover:bg-gray-100"
          >
            {t("reader.edit")}
          </Link>
        </footer>
      </div>
      <EditorLegend />
    </div>
  );
}
