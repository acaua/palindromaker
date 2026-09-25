---
status: accepted
---

# The reader is static, touch-first text

The `/p` reader used to mount ProseMirror with `editable: true` and refuse every edit (ADR-0003), purely to get ProseMirror's caret machinery for desktop arrow-key navigation and the purple caret-mirror. That made the reader a live `contenteditable` on phones: tapping the text to read it could summon the soft keyboard, and the one interaction the machinery existed for — moving a caret with a keyboard — is unreachable on touch. The reader is now plain semantic text: read-only-ness is structural (there is no editable surface and no mutation path), native selection and scroll are untouched, and mirror exploration is a tap-to-pivot plus a real 44px stepper. This supersedes ADR-0003, whose editable-but-locked design is now obsolete.
