# SplitMate

Expenses made simple.

SplitMate is a private, production-oriented personal fork of Spliit for sharing
expenses with friends and groups. It keeps Spliit's lightweight group-link access
model and proven expense engine, then adds a Splitwise-style dashboard, friends,
activity, UPI helpers, INR defaults, improved PWA metadata, and a polished app
shell.

## Core Features

- Personal dashboard with "you are owed", "you owe", and net balances.
- Currency-safe aggregation: INR, USD, and other currencies are never blindly summed.
- Friends derived from existing group participants, with friend detail pages.
- Existing group expense engine, split modes, reimbursements, recurring expenses,
  stats, exports, receipt uploads, and AI extraction retained.
- INR (`₹`) and `en-IN` are the default product assumptions for new groups.
- Browser-local My Identity settings for display name, initials, preferred
  currency, theme, locale, and optional UPI ID.
- UPI URI generation for explicit settlement flows. Opening UPI never marks a
  payment as settled.
- PWA-ready mobile shell with desktop sidebar and mobile bottom navigation.

## Architecture Overview

- Next.js App Router under `src/app`.
- Prisma 7 schema and migrations under `prisma/`.
- tRPC routers under `src/trpc/routers`.
- Existing financial logic in `src/lib/shares.ts` and `src/lib/balances.ts`.
- SplitMate personal aggregation in `src/lib/splitmate/personal-ledger.ts`.
- Central product config in `src/config/app.ts`.
- Client identity storage in `src/lib/identity.ts`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Local Development

Use the package manager already committed in this repo:

```bash
npm install
cp .env.example .env
npm run dev
```

The app requires PostgreSQL:

```bash
./scripts/start-local-db.sh
npx prisma migrate deploy
npx prisma generate
```

Open `http://localhost:3000`.

## Environment Variables

Required:

- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

Recommended:

- `DEFAULT_CURRENCY_CODE=INR`
- `BASE_URL=https://your-domain.example`

Optional storage:

- `ENABLE_EXPENSE_DOCUMENTS=true`
- `S3_UPLOAD_KEY`
- `S3_UPLOAD_SECRET`
- `S3_UPLOAD_BUCKET`
- `S3_UPLOAD_REGION`
- `S3_UPLOAD_ENDPOINT` for non-AWS S3-compatible storage

Optional AI:

- `ENABLE_RECEIPT_EXTRACT=true`
- `ENABLE_CATEGORY_EXTRACT=true`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL_RECEIPT_EXTRACT`
- `OPENAI_MODEL_CATEGORY_EXTRACT`

Optional analytics:

- `ANALYTICS_PROVIDER=console` or `plausible`
- `PLAUSIBLE_DOMAIN`
- `PLAUSIBLE_HOST`
- `PLAUSIBLE_SCRIPT_URL`
- `PLAUSIBLE_API_URL`

AI and uploads are feature flagged. The expense splitter works without OpenAI or
S3 credentials.

## Receipt Uploads

Receipt attachments reuse the existing S3-compatible upload implementation. Enable
`ENABLE_EXPENSE_DOCUMENTS` and provide the `S3_UPLOAD_*` variables. No second
storage system was added.

## AI Receipt Scanning And Categorization

Receipt scanning and category suggestions reuse the existing OpenAI-backed
server actions. They populate drafts/suggestions only; users still review and
save expenses manually. Missing AI credentials disable the feature instead of
breaking manual expense entry.

## UPI

Profiles can store an optional UPI ID. SplitMate can generate links like:

```text
upi://pay?pa=name%40bank&pn=Name&am=850.00&cu=INR&tn=SplitMate+settlement
```

UPI app launch is not payment confirmation. Record settlement manually after the
payment is actually complete.

## PWA

The manifest starts at `/`, uses SplitMate naming, and keeps the existing icon
sizes. Mobile navigation is bottom-aligned for standalone installs.

## Testing

```bash
npx prisma validate
npm run check-types
npm run lint
npm test -- --runInBand
npm run build
```

Playwright is available through:

```bash
npm run e2e
```

It requires the local E2E database/container setup from the existing Spliit
scripts.

## Vercel Deployment

1. Create a PostgreSQL database.
2. Set required database variables in Vercel.
3. Set `DEFAULT_CURRENCY_CODE=INR`.
4. Optionally set storage, AI, and analytics variables.
5. Deploy from this repository.
6. Run Prisma migrations as part of deployment (`postinstall` already runs
   `prisma migrate deploy && prisma generate`).

Do not run `prisma migrate reset` against production data.

## Privacy And Security Notes

- Group URLs are capability links. Treat them as sensitive.
- OpenAI keys remain server-side.
- Analytics is disabled unless configured.
- UPI links are generated locally from explicit profile data.
- Existing groups, participants, expenses, receipts, reimbursements, and
  migrations are preserved.

## Open-Source Attribution

SplitMate is based on the open-source Spliit project. The upstream license is
preserved in [LICENSE](LICENSE), and upstream attribution remains available in
the application settings and footer.
