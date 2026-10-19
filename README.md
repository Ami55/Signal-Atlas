# Signal Atlas — Vercel edition

This package is the Vercel-native version of Signal Atlas. It uses:

- Next.js for the application and API routes
- Neon Postgres for the shared capture library
- Vercel Blob for uploaded screenshots

No OpenAI API key is required.

## Deploy on Vercel

1. Upload this folder to a GitHub repository.
2. Import that repository into Vercel. Keep **Framework Preset** set to Next.js and leave the build/output settings at their defaults.
3. In the Vercel project, open **Storage**, connect a **Neon Postgres** database, and make sure it adds `DATABASE_URL` to the project.
4. In **Storage**, create a **Blob** store with public access and connect it to the project. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.
5. Open **Deployments** and redeploy the latest deployment.

The public library table is created automatically the first time the app loads. Two fictional examples are seeded once. Duplicate queries are skipped. Previous capture tables are preserved separately and are not exposed by the public app.

## Environment variables

```text
DATABASE_URL=postgresql://...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and supply your own Neon and Blob credentials before running locally.

## Public demo and target brand

Set NEXT_PUBLIC_TARGET_BRAND and NEXT_PUBLIC_TARGET_DOMAIN in Vercel, then rebuild to change the tracked brand. Defaults are fictional Example Travel and example.com. Public captures use the separate public_brand_captures table and fictional demo seed. Previous capture tables are preserved and are not read by the public app. Demo rows are labelled as fictional; no screenshot is imported.
