# Palindromaker

A tiny editor for crafting palindromes with live feedback: it highlights the
center characters, marks the gap that breaks the palindrome, and mirrors your
caret position against its matching character. The optional mirror mode
(toggle it in the toolbar) duplicates every character you type — and every
character you delete — at its mirror position, keeping the text a palindrome
as you write.

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
| `pnpm lint`      | Lint with ESLint 9                   |

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

### Manual deploy

```bash
pnpm deploy
```

Runs the build (`build.command` in `wrangler.jsonc`) and uploads `dist/`.

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
