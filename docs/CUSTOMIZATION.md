# SplitMate Customization

## What Changed From Upstream Spliit

- Visible product identity changed to SplitMate.
- Central configuration added at `src/config/app.ts`.
- Root page changed from a landing page to a personal dashboard.
- Desktop sidebar and mobile bottom navigation added.
- Friends, friend detail, global activity, and settings routes added.
- INR is now the default new-group currency.
- PWA manifest/offline metadata updated.
- Jest config stabilized with a direct Babel transform.
- New tests cover personal dashboard aggregation and UPI URI generation.

The original license and attribution were not removed.

## New Architecture

SplitMate does not add a duplicate accounting engine. It derives personal views
from existing groups, participants, expenses, and activities.

Important files:

- `src/lib/splitmate/personal-ledger.ts`: pure dashboard/friends aggregation.
- `src/trpc/routers/personal/dashboard.procedure.ts`: server data fetch for the
  personal ledger.
- `src/app/personal-data-client.tsx`: recent-group and active-user local storage
  bridge.
- `src/lib/identity.ts`: browser-local profile storage.
- `src/lib/upi.ts`: UPI URI helpers.

## Important Models

No new database models were required.

Existing models retained:

- `Group`
- `Participant`
- `Expense`
- `ExpensePaidFor`
- `ExpenseDocument`
- `Activity`
- `Category`
- `RecurringExpenseLink`

Friends are derived by participant name across groups. This is intentionally
compatible with Spliit's group-scoped participant model. A future `Person` model
can be added if cross-device identity becomes necessary.

## Dashboard Aggregation Logic

The client sends known `{ groupId, participantId }` pairs from local storage.
The server fetches those groups and calls `buildPersonalDashboard`.

The aggregation:

- computes group balances with `getBalances`;
- uses `getExpenseShares` for exact personal shares;
- buckets totals by `currencyCode` or custom currency symbol;
- never sums different currencies together;
- derives friend pair balances from payer/share relationships;
- uses existing activity rows only.

## Identity Implementation

Identity is stored in local storage under `splitmate.identity`. It contains:

- display name;
- initials;
- preferred currency;
- optional UPI ID;
- theme;
- locale.

This complements, but does not replace, each group's existing active-user
setting (`${groupId}-activeUser`).

## UPI Implementation

`src/lib/upi.ts` creates URL-encoded `upi://pay` links. The app does not listen
for payment success and does not automatically create settlements after a UPI
app opens.

## Settlement Implementation

Settlements continue to use Spliit's reimbursement expense model. This preserves
the existing balance engine and avoids a second accounting mechanism.

## AI Implementation

AI receipt extraction and category suggestions reuse the existing server-side
OpenAI flow. They are optional feature flags and must never directly save an
expense without user confirmation.

## Analytics Implementation

Existing analytics providers remain opt-in. SplitMate does not add a new
analytics service.

## Design Decisions

- Keep financial logic pure and tested.
- Avoid destructive migrations.
- Keep personal profile local because the app has no account system.
- Derive friends before adding a global person model.
- Keep optional features optional.

## Known Tradeoffs

- Friends are matched by participant name, so duplicate names across groups can
  merge in the personal dashboard.
- Direct friend expenses currently use the existing group creation flow instead
  of a hidden two-person direct group wizard.
- Activity only shows records that the existing activity table captured.

## Rename SplitMate

Change `src/config/app.ts`, then search for static documentation references.
Most runtime app metadata and UI labels consume `appConfig`.

## Change Theme

Theme tokens live in `src/app/globals.css` and Tailwind token mapping lives in
`tailwind.config.js`. Prefer updating CSS variables instead of hardcoding colors.
