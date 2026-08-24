# LEDGER Customization

## What Changed From Upstream Spliit

- Visible product identity is now LEDGER.
- Central product configuration lives in `src/config/app.ts`.
- Root page is a personal Overview, not a landing page.
- Desktop sidebar and mobile bottom navigation were redesigned.
- Friends, friend detail, direct friend expense, Activity, and Settings routes
  were added.
- Stable `Person` identities prevent display-name-based financial aggregation.
- Hidden `DirectGroup` records support one-to-one friend expenses.
- UPI QR/payment confirmation was added for INR settlements.
- INR, `en-IN`, and `Asia/Kolkata` are the default assumptions.
- PWA metadata and icons were rebuilt for LEDGER.

The original license and required attribution remain.

## Design System

LEDGER uses warm light surfaces, graphite dark mode, a violet-blue product
accent, restrained positive/negative balance colors, and tabular financial
numbers. Shared primitives live in:

- `src/components/ledger-logo.tsx`
- `src/components/ledger-ui.tsx`
- `src/app/globals.css`

## Important Architecture

LEDGER does not add a second accounting engine. It derives personal views from
the existing groups, participants, expenses, reimbursements, categories,
documents, and activity rows.

Important files:

- `src/lib/splitmate/personal-ledger.ts`: pure Overview/Friends aggregation.
- `src/trpc/routers/personal/dashboard.procedure.ts`: personal data fetch.
- `src/trpc/routers/personal/identity.procedure.ts`: identity linking, direct
  group creation, person details, and settlements.
- `src/lib/api.ts`: existing group/expense engine plus direct group helpers.
- `src/lib/upi.ts`: UPI URI generation.
- `src/lib/upi-validation.ts`: local VPA format validation.

## Identity

New/changed data model:

- `Person`
- `Participant.personId`
- `DirectGroup`

Legacy migration creates one `Person` per existing participant. It does not
merge participants by name. Users explicitly link or unlink identities from
friend detail pages.

Display names are used for display/search only. They are never authoritative
financial identity keys.

## Direct Expenses

Friends -> Friend detail -> Add expense opens a focused two-person form. LEDGER
creates or reuses a hidden direct group for the current user and friend, then
saves a normal equal-split expense through the existing engine.

## UPI

UPI payment links and QR codes are generated from explicit UPI IDs. Opening an
app or scanning a QR does not imply success. The user must press
`Mark as settled`, which creates a reimbursement expense.

## Currency

Overview and Friends bucket totals by currency. INR and USD balances are shown
separately unless a reliable persisted conversion mechanism exists.

## Known Tradeoffs

- The app intentionally keeps capability-link access rather than adding account
  authentication.
- Hidden direct groups are real groups internally, so low-level admin/export
  tooling may still see them.
- Activity shows only actions that were recorded in the existing activity table.

## Rename LEDGER

Change `src/config/app.ts`, update docs/static assets, and regenerate PWA icons
if the visual identity changes.

## Change Theme

Update CSS variables in `src/app/globals.css` and Tailwind token mapping in
`tailwind.config.js`. Avoid hardcoding colors in individual screens.
