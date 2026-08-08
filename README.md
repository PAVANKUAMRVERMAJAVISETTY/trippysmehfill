<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/006a66b9-0b2b-4c1a-9441-53b238e1fbb4

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Project layout

```
src/            application source
tests/          unit tests            npm test
e2e/            browser suites        npm run e2e
supabase/
  migrations/   authoritative schema, applied in numeric order
  verify/       migration harness against a real PostgreSQL
  legacy/       superseded schema files, kept for test coverage
docs/           all documentation — start at docs/README.md
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests |
| `npm run e2e` | Browser suites (needs a dev server on :4321) |

**Current status and outstanding work:** [docs/FINAL_PRODUCTION_DELIVERY_REPORT.md](docs/FINAL_PRODUCTION_DELIVERY_REPORT.md)
and [docs/PRODUCTION_DB_FIX.md](docs/PRODUCTION_DB_FIX.md).
