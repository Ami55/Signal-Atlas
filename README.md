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

The database table is created automatically the first time the app loads. Existing records from the Sites/Cloudflare edition are not copied automatically.

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
