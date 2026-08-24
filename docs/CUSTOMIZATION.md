# SplitMate Customization

## What Changed From Upstream Spliit

- Visible product identity changed to SplitMate.
- Central configuration added at `src/config/app.ts`.
- Root page changed from a landing page to a personal dashboard.
- Desktop sidebar and mobile bottom navigation added.
- Friends, friend detail, global activity, and settings routes added.
- Stable `Person` identities added so friends are never financially aggregated
  by display name.
- Direct friend expenses added through hidden two-person groups that reuse the
  existing expense engine.
- UPI QR/payment confirmation flow added for INR debts.
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
- `src/trpc/routers/personal/identity.procedure.ts`: participant linking,
  direct group creation, person details, and settlement mutations.
- `src/app/personal-data-client.tsx`: recent-group and active-user local storage
  bridge.
- `src/lib/identity.ts`: browser-local profile storage.
- `src/lib/upi.ts`: UPI URI helpers.

## Important Models

Existing models retained:

- `Group`
- `Participant`
- `Expense`
- `ExpensePaidFor`
- `ExpenseDocument`
- `Activity`
- `Category`
- `RecurringExpenseLink`

New models/fields:

- `Person`: stable human identity with display name, avatar, optional UPI ID,
  and timestamps.
- `Participant.personId`: optional link from a group-scoped participant to a
  stable person.
- `DirectGroup`: hidden one-to-one mapping from an unordered pair of `Person`
  IDs to a normal two-person group.

The migration creates one `Person` per legacy participant. It does not merge
participants with the same display name.

## Dashboard Aggregation Logic

The client sends known `{ groupId, participantId }` pairs from local storage.
The server fetches those groups and calls `buildPersonalDashboard`.

The aggregation:

- computes group balances with `getBalances`;
- uses `getExpenseShares` for exact personal shares;
- buckets totals by `currencyCode` or custom currency symbol;
- never sums different currencies together;
- derives friend pair balances from payer/share relationships keyed by stable
  identity;
- uses existing activity rows only.

Participant names are not used as financial identity keys. Names can change, and
two unrelated people can share a name. The ledger uses `Person.id`; if a record
does not have a person yet, the fallback key is scoped to that participant in
that group only.

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

Friend detail pages provide explicit linking and unlinking:

- link "Rahul" in one group to "Rahul Kumar" in another group when they are the
  same human;
- unlink a participant to create a separate `Person` without rewriting expenses.

Linking changes aggregation only. It does not edit historical expense rows.

## Direct Friend Expenses

Friends -> Friend detail -> Add Expense opens a simplified two-person form.
SplitMate creates or reuses a hidden direct group for the current user's
`Person.id` and the friend's `Person.id`, then submits a normal expense with
equal splits. The pair is order-independent, so A+B and B+A resolve to the same
direct group.

## UPI Implementation

`src/lib/upi.ts` creates URL-encoded `upi://pay` links after local VPA format
validation. The friend detail page displays a QR code and mobile-compatible UPI
link for INR debts when the friend has a plausible UPI ID.

The app does not listen for payment success and does not automatically create
settlements after a UPI app opens or a QR code is scanned. The user must press
`Mark as settled`.

## Settlement Implementation

Settlements continue to use Spliit's reimbursement expense model. Direct and UPI
settlements are created as reimbursement expenses in the relevant direct group,
preserving the existing balance engine and avoiding a second accounting
mechanism.

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
- Add a small stable `Person` model because display-name aggregation is unsafe.
- Keep optional features optional.

## Known Tradeoffs

- Identity linking is local to the capability groups the browser knows about;
  this is appropriate for the current lightweight access model but not a full
  account system.
- Direct friend groups are hidden from the Groups screen, but they are still real
  groups internally so existing exports/admin tools may see them.
- Activity only shows records that the existing activity table captured.

## Rename SplitMate

Change `src/config/app.ts`, then search for static documentation references.
Most runtime app metadata and UI labels consume `appConfig`.

## Change Theme

Theme tokens live in `src/app/globals.css` and Tailwind token mapping lives in
`tailwind.config.js`. Prefer updating CSS variables instead of hardcoding colors.
