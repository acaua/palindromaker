# Palindromaker

A tiny editor for crafting palindromes with live feedback: it highlights the
center characters, marks the gap that breaks the palindrome, and mirrors your
caret position against its matching character. The optional mirror mode
(toggle it in the card's status bar) duplicates every character you type — and
every character you delete — at its mirror position, keeping the text a
palindrome as you write.

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
| `pnpm deploy`    | Build and deploy to Cloudflare       |
| `pnpm test`      | Unit tests (Vitest)                  |
| `pnpm test:e2e`  | Browser tests (Playwright, Chromium) |
| `pnpm typecheck` | Type-check with `tsc`                |
| `pnpm lint`      | Lint with ESLint 10                  |
| `pnpm check`     | Type-check, lint, and unit tests     |

## Word finder

The "find words" panel — docked beside the editor, a bottom sheet on phones,
open by default (the status bar's "Find words" trigger toggles it) — searches
a dictionary of words — by prefix, suffix, or substring, accent-insensitively
— and shows each result's mirror (the reversed word). The language defaults to
pt-BR and can be switched to english, español, deutsch, français, or italiano.
Dictionaries are bundled as plain-text files in `public/dictionary/` and
fetched the first time the panel loads a language (which, with the panel open
by default, is on page load):

| Language       | File        | Source                                                                               | Words | License         |
| -------------- | ----------- | ------------------------------------------------------------------------------------ | ----- | --------------- |
| português (BR) | `pt-br.txt` | [IME USP `br-utf8.txt`](https://www.ime.usp.br/~pf/dicios/)                          | ~262k | GPL (br.ispell) |
| english        | `en.txt`    | [`an-array-of-english-words`](https://github.com/words/an-array-of-english-words)    | ~275k | MIT             |
| español        | `es.txt`    | [`an-array-of-spanish-words`](https://github.com/words/an-array-of-spanish-words)    | ~637k | MIT             |
| deutsch        | `de.txt`    | [`an-array-of-german-words`](https://github.com/hexapode/an-array-of-german-words)   | ~117k | MIT             |
| français       | `fr.txt`    | [`an-array-of-french-words`](https://github.com/words/an-array-of-french-words)      | ~337k | MIT             |
| italiano       | `it.txt`    | [`an-array-of-italian-words`](https://github.com/hexapode/an-array-of-italian-words) | ~124k | MIT             |

## Analytics

Set your GoatCounter endpoint in a `.env.local` file (see
`.env.local.example`):

```
VITE_GOATCOUNTER_URL=https://yourcode.goatcounter.com/count
```

## Deploy

The site deploys to [Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/)
as a static-asset Worker, with builds triggered by pushes to GitHub:

- **`main`** deploys to production at `palindromaker.<subdomain>.workers.dev`
- Any other branch gets a preview URL

Dictionary files are cached in the browser for a week (then
stale-while-revalidate for a day) via a `_headers` file shipped from
`public/`.

### Manual deploy

```bash
pnpm deploy
```

Type-checks, runs the unit tests, builds (`build.command` in
`wrangler.jsonc`), and uploads `dist/` — a failing check blocks the deploy.

### CI setup (Workers Builds)

1. Cloudflare dashboard → Workers & Pages → **Create → Workers → Import a
   repository** → select `acaua/palindromaker`
2. Add these **build variables** in the Worker's build settings:

   | Variable               | Value                                         |
   | ---------------------- | --------------------------------------------- |
   | `VITE_GOATCOUNTER_URL` | `https://palindromaker.goatcounter.com/count` |
   | `NODE_VERSION`         | `22`                                          |

Build and deploy commands are read from `wrangler.jsonc`, so no other
configuration is needed.
