# Bank Reconciliation Extraction Platform

Web-first, desktop-portable document extraction platform for bank summaries, reconciliations, and spending classification.

## Workspace layout

- `apps/web`: Next.js web app and server actions
- `packages/domain`: shared domain model, validation, adapters, and Drizzle schema
- `packages/extraction`: Gemini extraction pipeline and mock fallback
- `packages/export`: Excel export helpers

## Local development

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Add your keys as you get them:
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Start the app: `npm run dev`
5. Open `http://localhost:3000`

If `GEMINI_API_KEY` is not set, extraction falls back to a deterministic mock provider so the review/export flow still works.

If Supabase keys are not set yet, the current prototype still runs on the local dev persistence layer.

## Supabase live test

This repo now uses real Supabase migrations under:

- `supabase/migrations/`

Recommended flow:

1. Install or use the Supabase CLI
2. Link your project if needed
3. Run:

```bash
npx supabase db push
```

That will apply the migration that creates:

- the app tables
- permissive live-test RLS policies
- the source/export storage buckets

After that, restart `npm run dev` and the app will use Supabase-backed data and file storage automatically when the public Supabase env vars are present.
