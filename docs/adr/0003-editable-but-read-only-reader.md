---
status: superseded by ADR-0005
---

# The reader is editable, but refuses every edit

The `/p` reader mounts ProseMirror with `editable: true` on purpose: ProseMirror gates its keydown and caret machinery on `view.editable`, and browsers do not move a caret inside `contenteditable="false"`, so the obvious non-editable view silently loses arrow-key navigation. Read-only-ness is instead enforced on two other layers — the input events (`beforeinput`, `paste`, `drop`, `cut`) are claimed and cancelled, and a `filterTransaction` plugin drops every doc-changing transaction — with `role="region"` rather than `textbox` so assistive tech does not announce an input. This contradicts the obvious implementation, so it is recorded before someone "fixes" it back to `editable: false`.
