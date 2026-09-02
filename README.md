# Palindromaker

A tiny editor for crafting palindromes with live feedback: it highlights the
center characters, marks the gap that breaks the palindrome, and mirrors your
caret position against its matching character.

## Stack

- [Vite](https://vite.dev/) + [React 19](https://react.dev/) + TypeScript (strict)
- [TipTap 3](https://tiptap.dev/) (ProseMirror) with a custom `Palindrome`
  extension that drives the highlighting via ProseMirror decorations
- [Tailwind CSS 4](https://tailwindcss.com/)
- [GoatCounter](https://www.goatcounter.com/) for privacy-friendly analytics

## Getting started

Requires Node 20+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173.

## Scripts

| Script           | What it does                         |
| ---------------- | ------------------------------------ |
| `pnpm dev`       | Start the dev server                 |
| `pnpm build`     | Production build to `dist/`          |
| `pnpm preview`   | Serve the production build           |
| `pnpm test`      | Unit tests (Vitest)                  |
| `pnpm test:e2e`  | Browser tests (Playwright, Chromium) |
| `pnpm typecheck` | Type-check with `tsc`                |
| `pnpm lint`      | Lint with ESLint 9                   |

## Analytics

Set your GoatCounter endpoint in a `.env.local` file (see
`.env.local.example`):

```
VITE_GOATCOUNTER_URL=https://yourcode.goatcounter.com/count
```

## Deploy

`pnpm build` produces a fully static site in `dist/` — serve it from any
static host (Vercel, Netlify, GitHub Pages, nginx, ...).
