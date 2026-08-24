# LEDGER

Shared money, made clear.

LEDGER is a private expense-sharing application for friends and groups, built on
the open-source Spliit foundation. It keeps the proven group expense engine and
lightweight link-based access model, then adds a polished personal finance
experience: Overview, Friends, direct expenses, stable people identities, UPI
settlement helpers, receipt uploads, optional AI extraction, dark mode, and PWA
installation.

## Features

- Overview with owed, owing, and net balances shown separately by currency.
- Stable `Person` identity model; display names are never financial identity
  keys.
- Friends list and counterparty detail pages with explicit link/unlink controls.
- Direct friend expenses through hidden two-person groups using the existing
  expense engine.
- Group expenses, split modes, reimbursements, recurring expenses, stats,
  exports, receipts, and activity retained from the Spliit engine.
- UPI payment URI and QR generation with explicit manual settlement
  confirmation.
- INR, `en-IN`, and `Asia/Kolkata` defaults.
- Optional OpenAI receipt/category extraction that never saves without review.
- Responsive LEDGER UI with dark mode and PWA metadata/icons.

## Architecture

- Next.js App Router under `src/app`.
- Prisma schema and migrations under `prisma/`.
- tRPC routers under `src/trpc/routers`.
- Existing financial logic in `src/lib/shares.ts` and `src/lib/balances.ts`.
- Personal aggregation in `src/lib/splitmate/personal-ledger.ts`.
- Product configuration in `src/config/app.ts`.
- Browser-local profile storage in `src/lib/identity.ts`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Local Development

```bash
npm install
cp .env.example .env
./scripts/start-local-db.sh
npx prisma migrate deploy
npx prisma generate
npm run dev
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
- `S3_UPLOAD_ENDPOINT`

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

The app remains a complete expense splitter without S3 or OpenAI credentials.

## Database Migrations

Deploy migrations safely:

```bash
npx prisma migrate deploy
npx prisma generate
```

The LEDGER identity migration is non-destructive. It creates one `Person` per
legacy `Participant`, links participants conservatively, and does not merge
people because their names match. Never run `prisma migrate reset` against
production data.

## UPI

Friends can store optional UPI IDs. LEDGER generates encoded UPI payment links
and QR codes, for example:

```text
upi://pay?pa=name%40bank&pn=Name&am=850.00&cu=INR&tn=LEDGER+settlement
```

Opening a UPI app or scanning a QR code is not proof of payment. LEDGER records a
settlement only when the user explicitly presses `Mark as settled`.

## Receipts And AI

Receipt attachments reuse the existing S3-compatible upload implementation.
Receipt extraction and category suggestions reuse the server-side OpenAI flow.
AI returns drafts/suggestions only; users must review and save expenses
manually.

## Testing

```bash
npm run check-formatting
npm run lint
npm run check-types
npm test -- --runInBand
npx prisma validate
npx prisma generate
npm run build
```

Playwright E2E:

```bash
npm run e2e
```

The E2E script starts an isolated app and PostgreSQL stack through Docker
Compose. It does not use a real developer or production database.

## Vercel Deployment

1. Create a PostgreSQL database.
2. Configure the required database environment variables in Vercel.
3. Set `DEFAULT_CURRENCY_CODE=INR`.
4. Optionally configure storage, AI, and analytics variables.
5. Deploy from this repository.
6. Ensure migrations run with `prisma migrate deploy`.

Do not hardcode deployment URLs or point previews at destructive databases.

## Open-Source Attribution

LEDGER is based on the open-source Spliit project. The original license remains
in [LICENSE](LICENSE), and upstream attribution is preserved in the app and
documentation.
