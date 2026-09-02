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
| `pnpm lint`                   | ESLint 9 flat config                          |
| `pnpm build` / `pnpm preview` | Static build to `dist/` / serve it            |

There is no combined check script. `pnpm build` (Vite) does **not** type-check. Run `pnpm typecheck && pnpm lint && pnpm test` for a full check.

- Single test: `pnpm vitest run src/lib/mirror-edit.test.ts`
- Pre-commit (husky → lint-staged) runs `prettier --write`, `eslint --cache --fix`, and `vitest related --run` on staged files.

## Conventions

- Path alias `@/*` → `src/*` (configured in both `tsconfig.json` and `vite.config.mjs`).
- `verbatimModuleSyntax` + `noUnusedLocals/Parameters` are on: type-only imports must use `import type`.
- Tests are colocated as `*.test.ts` (unit) in `src/` and `e2e/` (Playwright). Vitest excludes `e2e/**` via `vite.config.mjs`.

## Architecture

- `src/lib/check-palindrome.ts` — core algorithm. Normalizes (NFD, strips combining marks, lowercases) and pairs only letters (`\p{L}`). Returns `isPalindrome`, `mirror[]`, `center`.
- `src/lib/palindrome-extension.ts` — TipTap `Palindrome` extension; `analyzeDoc()` joins doc text normalized per character (keeping text indexes aligned with doc positions; `undefined` for `\n` block separators and chars the normalizer drops) and caches the analysis so caret moves only rebuild the caret decoration. Drives center/gap/caret highlights via ProseMirror decorations.
- `src/lib/mirror-extension.ts` — TipTap `MirrorEditing` extension; an `appendTransaction` plugin duplicates/deletes mirrored characters. Only reacts to single-step `ReplaceStep`s, ignores its own edits (`{ own: true }` meta) and IME composition. Position math lives in `src/lib/mirror-edit.ts` and counts in "letter space" (punctuation/separators invisible).
- `src/components/editor.tsx` — wires StarterKit (most extensions disabled) + the two custom extensions; default content is a sample palindrome.
- `src/main.tsx` — injects GoatCounter only when `VITE_GOATCOUNTER_URL` is set (see `.env.local.example`).

## Gotchas

- The slow keystroke pacing in `e2e/palindromaker.spec.ts` is needed for
  ProseMirror's selection sync to keep up with synthetic CDP input; it is
  relied upon, don't "optimize" it away.
- Playwright tests need Chromium installed: `pnpm exec playwright install chromium`.
- Decoration styling mixes inline Tailwind classes (e.g. `bg-blue-200`, `bg-red-300`, `bg-purple-200/400`) with `pm-center1`/`pm-center2` rules in `src/styles/globals.css`; the e2e suite asserts on these class names.
