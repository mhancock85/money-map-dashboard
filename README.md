# Money Map Dashboard App

This folder contains the Next.js dashboard application.

For overall project context, roadmap, and implementation status, read:

- [`../README.md`](../README.md)

## Quick Start

From this directory:

```bash
npm ci
npm run dev
```

Open:

- `http://localhost:3000`

## Environment Variables

Create `.env.local` in this folder with:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

These are used by `src/lib/supabase.ts`.

## Notes

- The UI currently includes static/mock sections while live data integration is
  completed.
- Primary deployment target is Vercel.
- `.github/workflows/deploy.yml` is retained as a legacy manual-only workflow
  and is not the production deployment path.
- Vercel Next.js framework lock is set in `vercel.json`.
- Use the stable Vercel alias as the main app link; treat per-deployment URLs
  as debug snapshots.

## Cost Control

- Run and validate locally first (`npm run dev`) before pushing.
- Batch related changes into fewer pushes/merges.
- Keep Vercel `Ignored Build Step` configured to skip random branch deploys.
