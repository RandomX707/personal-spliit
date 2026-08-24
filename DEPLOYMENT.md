# LEDGER Personal Deployment

This repository is prepared for a personal LEDGER deployment on Vercel with
PostgreSQL. It keeps the upstream Spliit financial engine and link-based group
access model intact, while branding and personal Overview screens are customized
for LEDGER. INR is the default currency for new groups.

Do not enable OpenAI, receipt extraction, S3, or custom authentication yet. Those
features are optional and stay disabled while their environment flags are unset.

## Architecture

```text
Browser
  |
  v
Vercel
  |
  v
Next.js / LEDGER
  |
  v
Prisma
  |
  v
PostgreSQL
```

## Required Services

- GitHub
- Vercel
- PostgreSQL provider such as Neon

## Environment Variables

Configure these in Vercel before the first deploy:

```env
POSTGRES_PRISMA_URL=<pooled PostgreSQL connection string>
POSTGRES_URL_NON_POOLING=<direct/non-pooled PostgreSQL connection string>
DEFAULT_CURRENCY_CODE=INR
```

`BASE_URL` is optional on Vercel because LEDGER falls back to
`https://$VERCEL_URL`. After you have a stable production URL, you can set:

```env
BASE_URL=https://your-project.vercel.app
```

Leave these unset for now:

```env
ENABLE_EXPENSE_DOCUMENTS=
ENABLE_RECEIPT_EXTRACT=
ENABLE_CATEGORY_EXTRACT=
OPENAI_API_KEY=
S3_UPLOAD_KEY=
S3_UPLOAD_SECRET=
S3_UPLOAD_BUCKET=
S3_UPLOAD_REGION=
```

## Deploying To Vercel

1. Go to Vercel.
2. Add a new project.
3. Import this GitHub repository.
4. Keep Vercel's auto-detected settings.
5. Use Node.js 24 or newer. The repository declares this in `package.json`.
6. Create a PostgreSQL database with Neon or another Vercel-compatible provider.
7. Add the required environment variables above.
8. Deploy.

## Database Migrations

LEDGER uses Prisma migrations in `prisma/migrations`.

The current package scripts run this during dependency installation:

```sh
prisma migrate deploy && prisma generate
```

That means Vercel will apply pending migrations and generate the Prisma client
during the build environment setup, as long as `POSTGRES_URL_NON_POOLING` and
`POSTGRES_PRISMA_URL` are configured first.

Use a direct/non-pooled database URL for `POSTGRES_URL_NON_POOLING` because
Prisma Migrate should not run through a transaction pooler. Use the pooled URL
for `POSTGRES_PRISMA_URL` when your provider offers one.

## Updating Upstream Later

Keep the official Spliit repository as `upstream` and your GitHub repository as
`origin`.

To pull future upstream changes:

```sh
git fetch upstream
git merge upstream/main
npm install
npm test
npm run build
```

If upstream changes `.env.example`, `package.json`, Prisma, or deployment
behavior, review those changes before deploying.
