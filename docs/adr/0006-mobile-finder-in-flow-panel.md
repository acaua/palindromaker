---
status: accepted
---

# The mobile word finder is an in-flow panel, not an overlay

On phones the finder used to be a fixed bottom sheet pinned at `top-[48dvh]`, with `editor-page.tsx` reserving `pb-[52dvh]` so the panel could never cover the legend. On short screens the sheet's fixed chrome (search, language, match-mode, hint, legend) outgrew its own height, so the virtualized result list collapsed to 0px and no results were visible at 375px and below — and at 390px only one cramped row showed. The finder is now an ordinary block in the page flow below the editor card: the editor is never covered, the user scrolls down to reach the finder, and the result list caps itself (`max-md:max-h-[55dvh]`, `max-md:flex-none`) and scrolls internally. From `md` up it stays the fixed side panel docked at `top-16`.
