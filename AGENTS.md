# AGENTS.md

Palindromaker: a Vite + React 19 + TypeScript (strict) single-page editor for crafting palindromes, built on TipTap 3 (ProseMirror) with two custom extensions.

## Commands

Use **pnpm** (not npm/yarn). Requires Node 20+.

| Command                       | Purpose                                       |
| ----------------------------- | --------------------------------------------- |
| `pnpm dev`                    | Dev server at http://localhost:5173           |
| `pnpm test`                   | Unit tests (Vitest), single run               |
| `pnpm test:e2e`               | Playwright (Chromium), auto-starts `pnpm dev` |
| `pnpm typecheck`              | `tsc` (noEmit) — separate from build/lint     |
| `pnpm lint`                   | ESLint 10 flat config                         |
| `pnpm build` / `pnpm preview` | Static build to `dist/` / serve it            |

`pnpm check` runs typecheck + lint + unit tests for a full check. Note `pnpm build` (Vite) does **not** type-check.

- Single test: `pnpm vitest run src/lib/mirror-edit.test.ts`
- Pre-commit (husky → lint-staged) runs `prettier --write`, `eslint --cache --fix`, and `vitest related --run` on staged files.

## Conventions

- Path alias `@/*` → `src/*` (configured in both `tsconfig.json` and `vite.config.mjs`).
- `verbatimModuleSyntax` + `noUnusedLocals/Parameters` are on: type-only imports must use `import type`.
- Tests are colocated as `*.test.ts` (unit) in `src/` and `e2e/` (Playwright). Vitest excludes `e2e/**` via `vite.config.mjs`.
- `src/lib/` is framework-agnostic (no React); React hooks live in `src/hooks/` and components in `src/components/`.

## Architecture

- `src/lib/check-palindrome.ts` — core algorithm. Normalizes (NFD, strips combining marks, lowercases) and pairs only letters (`\p{L}`). Returns `isPalindrome`, `mirror[]`, `center` (innermost matching pair) and `gap` (inclusive range of unpaired letters, which exists even when nothing matched).
- `src/lib/doc-analysis.ts` — the document as the checker sees it, and the only place that bridges doc positions and text indexes. `analyzeDoc()` walks the doc once and returns `text` (normalized per character, so indexes stay aligned with `positions`), `positions` (text index → doc position; `undefined` for `\n` block separators and normalization expansions), `posToIndex`, `letterPositions` (letter ordinal → doc position) and the `checkPalindrome` `result`. Memoized in a `WeakMap` keyed by the (immutable) doc node, so both extensions analyzing the same keystroke cost one pass.
- `src/lib/palindrome-extension.ts` — TipTap `Palindrome` extension; drives center/gap/caret highlights via ProseMirror decorations and caches the analysis plus the doc-only decorations in plugin state, so caret moves only rebuild the caret decoration.
- `src/lib/mirror-extension.ts` — TipTap `MirrorEditing` extension; an `appendTransaction` plugin duplicates/deletes mirrored characters. Only reacts to single-step `ReplaceStep`s, ignores its own edits (`{ own: true }` meta) and IME composition. Position math lives in `src/lib/mirror-edit.ts` and counts in "letter space" (punctuation/separators invisible) off `letterPositions`. Options: `enabled` seeds the toggle (restored from prefs, so no toggle transaction after mount) and `onChange` fires when the toggle command runs — that is where the preference gets written.
- `src/lib/persistence.ts` — debounced `localStorage` persistence, and the only module that touches the global: `localStorageOrNull()` returns the storage or null, since reading `window.localStorage` _throws_ when the browser blocks site storage (iframe, cookies disabled) and would otherwise crash the app before it renders. Every storage function takes that value, so tests inject their own. `readStoredDoc()` loads and validates the stored doc JSON against the editor schema (null on anything unexpected — including parseable-but-unrenderable docs, which would otherwise crash render) for the editor's initial content; `createPersistence()` saves on editor updates and flushes on destroy/unload/tab-hide, returning `{ detach, resolveConflict }` (detach is the React effect cleanup in `editor.tsx`). Because every tab shares one stored doc, it also listens for `storage` events: a tab the user has not edited adopts the incoming doc silently, a tab that _has_ been edited raises `onConflict` and stops saving until `resolveConflict("theirs" | "mine")` answers it (`src/components/conflict-notice.tsx`). Saves also compare storage against the last string this tab wrote, so a frozen tab that missed the event still cannot clobber it.
- `src/lib/dictionary.ts` — word finder dictionaries: lazily fetched per language (cached promises); `buildDictionary()` keeps raw + normalized words and a normalized `Set` used by `mirrorMatch()` to mark rows whose mirror is also a word ("pair") or is itself a palindrome. The load path uses `buildDictionaryIncrementally()`, which runs the same generator in ~20k-line slices and yields the main thread between them (`scheduler.yield()`, falling back to a timer); `buildDictionary()` runs it to completion and is what tests use.
- Word finder UI: `src/hooks/use-dictionary.ts` owns loading as one value (`idle | loading | ready | error`, where `loading` is derived from "no answer yet for this language") so a failed or pending language cannot leave the previous one's words on screen; `src/components/word-finder.tsx` holds the panel state and derives results with `useMemo`; `word-finder-controls.tsx` is the query/language/mode row and `word-finder-results.tsx` owns the virtualizer.
- `src/components/editor.tsx` — wires StarterKit (most extensions disabled) + the two custom extensions; storage is read once (a `useState` initializer) for the initial content, falling back to `SAMPLE_CONTENT` (`src/lib/sample.ts`, its own module so the e2e suite can assert on it without importing TipTap), and for the mirror toggle passed to `MirrorEditing.configure()`. Renders the card: Toolbar, the cross-tab conflict notice, editor, WordFinder, and the always-visible color legend (`src/components/legend.tsx`).
- `src/main.tsx` — injects GoatCounter only when `VITE_GOATCOUNTER_URL` is set (see `.env.local.example`).

## Gotchas

- The slow keystroke pacing in `e2e/palindromaker.spec.ts` is needed for
  ProseMirror's selection sync to keep up with synthetic CDP input; it is
  relied upon, don't "optimize" it away.
- Playwright tests need Chromium installed: `pnpm exec playwright install chromium`.
- Decoration styling mixes inline Tailwind classes (e.g. `bg-blue-200`, `bg-red-300`, `bg-purple-200/400`) with `pm-center1`/`pm-center2` rules in `src/styles/globals.css`; the e2e suite asserts on these class names.
- Don't move the dictionary build into a Web Worker without measuring first: es is 635k words, and structured-cloning the built dictionary back to the main thread was measured at ~213ms against ~282ms to build it, so a worker buys almost nothing. Slicing the build (above) removed the blocking instead. Loading es still costs ~97MB of heap; cutting that needs a different data structure (one flat string + offset/hash `Uint32Array`s, which _are_ cheap to transfer), not a worker.
