# Lesson Plan Editor — Frontend

Standalone React + Vite single-page app for the LEARN-FAIR lesson plan editor.
It talks to the Symfony backend API (a separate repository) over HTTPS and is
deployed as a static site on **Cloudflare Pages**.

## Architecture

- **Frontend** (this repo): `editor.fairdata.education` — static SPA on Cloudflare Pages.
- **Backend** (separate repo): `api.editor.fairdata.education` — Symfony API + GitHub OAuth.

Both hosts share the registrable domain `fairdata.education`, so they are
*same-site*. Authentication uses the backend's session cookie (`SameSite=Lax`),
which the browser sends with cross-origin API requests because they stay
within the same site. All requests are made with `credentials: 'include'`.

## Configuration

The API base URL is injected at build time via `VITE_API_URL`:

| File               | Used when            | Value                                          |
| ------------------ | -------------------- | ---------------------------------------------- |
| `.env.development` | `npm run dev`        | `http://localhost:8000/api`                    |
| `.env.production`  | `npm run build`      | `https://api.editor.fairdata.education/api`     |

Override in the Cloudflare Pages dashboard (Settings → Environment variables)
if the API domain differs.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173, talks to localhost:8000 backend
```

## Build

```bash
npm run build      # outputs static assets to dist/
npm run preview    # serve the production build locally
```

## Deploy to Cloudflare (Workers static assets)

Deployment uses **Wrangler** — the built `dist/` is served as static assets by a
Cloudflare Worker. SPA fallback is handled by `not_found_handling:
single-page-application` in `wrangler.jsonc` (no `_redirects` file needed).

### Automatic (GitHub Actions)

`.github/workflows/deploy.yml` runs on every push:

- **`main`** → builds with the production API URL and runs `wrangler deploy --env production`
  (custom domain `editor.fairdata.education`).
- **any other branch** → deploys a preview Worker named `learn-fair-lesson-plan-editor-<branch-slug>`
  (served on a `*.workers.dev` URL).

Requires the repository secret **`CLOUDFLARE_API_TOKEN`** (a token with Workers
edit + custom-domain permissions).

### Manual

```bash
npm run build -- --mode production
npx wrangler deploy --env production
```

## Backend requirements

The backend must allow this origin. In the backend repo set:

- `CORS_ALLOW_ORIGIN` to match `https://editor.fairdata.education`
- `FRONTEND_URL=https://editor.fairdata.education` (used for the post-OAuth redirect)
