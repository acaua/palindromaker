# Palindromaker

A tiny editor for crafting palindromes with live feedback: it highlights the
center characters, marks the gap that breaks the palindrome, and mirrors your
caret position against its matching character. The optional mirror editing
(toggle it in the card's status bar) duplicates every letter you type — and
every letter you delete — at its mirror position, keeping the text a
palindrome as you write.

Beyond the editor: the word finder inserts dictionary words straight into the
mirror; a finished palindrome can be shared as a link (the text rides in the
URL fragment) and opens in a read-only reader; and Bluesky posts can be read
for the palindrome inside them, browsed by palindrome hashtag on the Explore
page, or posted straight from the share menu. The interface speaks the same six
languages as the dictionaries, and an About page explains the idea.

## Stack

- [Vite+](https://viteplus.dev/) (Vite 8 + Vitest + Oxlint + Oxfmt through the
  `vp` CLI) + [React 19](https://react.dev/) + TypeScript (strict)
- [TipTap 3](https://tiptap.dev/) (ProseMirror) with two custom extensions: a
  `Palindrome` extension that drives the highlights via ProseMirror
  decorations, and `MirrorEditing`, which reproduces each typed letter at its
  mirror position
- [TanStack Router](https://tanstack.com/router) (code-based routes) and
  [TanStack Virtual](https://tanstack.com/virtual) for the finder's result list
- [Tailwind CSS 4](https://tailwindcss.com/)
- [GoatCounter](https://www.goatcounter.com/) for privacy-friendly analytics
- Vitest (unit, split between a node and a happy-dom environment) and Playwright
  (Chromium e2e, including axe accessibility sweeps)

## Getting started

Requires a Node the Vite+ toolchain supports — 20.19+, 22.18+, or 24.11+ — and
[pnpm](https://pnpm.io/) (CI runs Node 24).

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173.

## Scripts

| Script               | What it does                         |
| -------------------- | ------------------------------------ |
| `pnpm dev`           | Start the dev server                 |
| `pnpm build`         | Production build to `dist/`          |
| `pnpm preview`       | Serve the production build           |
| `pnpm deploy`        | Build and deploy to Cloudflare       |
| `pnpm test`          | Unit tests (Vitest)                  |
| `pnpm test:coverage` | Unit tests with a coverage summary   |
| `pnpm test:e2e`      | Browser tests (Playwright, Chromium) |
| `pnpm check`         | Format, lint, type-check, unit tests |

## Word finder

The "find words" panel — docked beside the editor, a bottom sheet on phones,
open on first load, with the choice remembered as a pref (the status bar's
"Find words" trigger toggles it) — searches a dictionary of words — by prefix,
suffix, or substring, accent-insensitively — and shows each result's mirror
(the reversed word). The language defaults to pt-BR and can be switched to
english, español, deutsch, français, or italiano. Dictionaries are bundled as
plain-text files in `public/dictionary/` and fetched the first time the panel
loads a language (which is on page load, unless the panel was closed in a
previous session):

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

GitHub Actions CI (`.github/workflows/ci.yml`) runs on every pull request and
on pushes to `main`: a check job (`vp check` + unit tests on Node 24, via
`voidzero-dev/setup-vp`) followed by a Playwright e2e job. Other branches are
built by Workers Builds as previews. CI only checks — deploys belong to Workers
Builds, whose build command (`pnpm check && vp build` in `wrangler.jsonc`) runs
the unit tests too.

Dictionary files are cached in the browser for a week (then
stale-while-revalidate for a day) via a `_headers` file shipped from
`public/`.

### Manual deploy

```bash
pnpm deploy
```

Runs `pnpm check` (format, lint, type-check, unit tests), builds (`build.command`
in `wrangler.jsonc`), and uploads `dist/` — a failing check or test blocks the
deploy.

### CI setup (Workers Builds)

1. Cloudflare dashboard → Workers & Pages → **Create → Workers → Import a
   repository** → select `acaua/palindromaker`
2. Add these **build variables** in the Worker's build settings:

   | Variable               | Value                                         |
   | ---------------------- | --------------------------------------------- |
   | `VITE_GOATCOUNTER_URL` | `https://palindromaker.goatcounter.com/count` |
   | `NODE_VERSION`         | `24`                                          |

Build and deploy commands are read from `wrangler.jsonc`, so no other
configuration is needed.
