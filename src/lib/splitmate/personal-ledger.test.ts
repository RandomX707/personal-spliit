import { ActivityType, SplitMode } from '@/generated/prisma/browser'
import {
  LedgerExpense,
  LedgerGroup,
  buildPersonalDashboard,
} from './personal-ledger'

const participants = [
  { id: 'you', name: 'You' },
  { id: 'rahul', name: 'Rahul' },
  { id: 'priya', name: 'Priya' },
  { id: 'arjun', name: 'Arjun' },
]

function expense(overrides: Partial<LedgerExpense>): LedgerExpense {
  return {
    id: overrides.id ?? 'expense',
    title: overrides.title ?? 'Dinner',
    amount: overrides.amount ?? 0,
    expenseDate: overrides.expenseDate ?? new Date('2026-08-20T00:00:00.000Z'),
    createdAt: overrides.createdAt ?? new Date('2026-08-20T10:00:00.000Z'),
    isReimbursement: overrides.isReimbursement ?? false,
    splitMode: overrides.splitMode ?? SplitMode.EVENLY,
    category: overrides.category ?? null,
    paidBy: overrides.paidBy ?? participants[0],
    paidFor:
      overrides.paidFor ??
      participants.map((participant) => ({ participant, shares: 1 })),
    _count: overrides._count ?? { documents: 0 },
  }
}

function group(overrides: Partial<LedgerGroup>): LedgerGroup {
  return {
    id: overrides.id ?? 'group',
    name: overrides.name ?? 'Goa Trip',
    currency: overrides.currency ?? '₹',
    currencyCode: overrides.currencyCode ?? 'INR',
    createdAt: overrides.createdAt ?? new Date('2026-08-18T00:00:00.000Z'),
    participants: overrides.participants ?? participants,
    expenses: overrides.expenses ?? [],
    activities: overrides.activities ?? [
      {
        id: 'activity',
        time: new Date('2026-08-20T11:00:00.000Z'),
        activityType: ActivityType.CREATE_EXPENSE,
        participantId: 'you',
        expenseId: 'expense',
        data: 'Dinner',
      },
    ],
  }
}

describe('SplitMate personal ledger', () => {
  it('aggregates a four-person equal expense without losing money', () => {
    const dashboard = buildPersonalDashboard(
      [group({ expenses: [expense({ amount: 240000 })] })],
      [{ groupId: 'group', participantId: 'you' }],
    )

    expect(dashboard.totals.owed).toEqual([
      { currency: '₹', currencyCode: 'INR', amount: 180000 },
    ])
    expect(dashboard.groups[0].myShare).toBe(60000)
    expect(dashboard.groups[0].myPaid).toBe(240000)
    expect(dashboard.groups[0].myBalance).toBe(180000)
  })

  it('keeps currencies in separate dashboard buckets', () => {
    const dashboard = buildPersonalDashboard(
      [
        group({
          id: 'inr',
          currency: '₹',
          currencyCode: 'INR',
          expenses: [
            expense({
              id: 'inr-expense',
              amount: 20000,
              paidFor: participants.slice(0, 2).map((participant) => ({
                participant,
                shares: 1,
              })),
            }),
          ],
        }),
        group({
          id: 'usd',
          currency: '$',
          currencyCode: 'USD',
          expenses: [
            expense({
              id: 'usd-expense',
              amount: 10000,
              paidBy: participants[1],
              paidFor: participants.slice(0, 2).map((participant) => ({
                participant,
                shares: 1,
              })),
            }),
          ],
        }),
      ],
      [
        { groupId: 'inr', participantId: 'you' },
        { groupId: 'usd', participantId: 'you' },
      ],
    )

    expect(dashboard.totals.net).toEqual([
      { currency: '₹', currencyCode: 'INR', amount: 10000 },
      { currency: '$', currencyCode: 'USD', amount: -5000 },
    ])
  })

  it('derives friend balances from shared expense flows', () => {
    const dashboard = buildPersonalDashboard(
      [
        group({
          expenses: [
            expense({
              amount: 100000,
              splitMode: SplitMode.BY_AMOUNT,
              paidFor: [
                { participant: participants[0], shares: 50000 },
                { participant: participants[1], shares: 30000 },
                { participant: participants[2], shares: 20000 },
              ],
            }),
          ],
        }),
      ],
      [{ groupId: 'group', participantId: 'you' }],
    )

    expect(dashboard.groups[0].myBalance).toBe(50000)
    expect(
      dashboard.friends.find((friend) => friend.name === 'Rahul')?.balances,
    ).toEqual([{ currency: '₹', currencyCode: 'INR', amount: 30000 }])
    expect(
      dashboard.friends.find((friend) => friend.name === 'Priya')?.balances,
    ).toEqual([{ currency: '₹', currencyCode: 'INR', amount: 20000 }])
  })

  it('settlements reduce balances through the existing reimbursement model', () => {
    const dashboard = buildPersonalDashboard(
      [
        group({
          participants: participants.slice(0, 2),
          expenses: [
            expense({
              id: 'taxi',
              amount: 170000,
              paidBy: participants[1],
              paidFor: participants.slice(0, 2).map((participant) => ({
                participant,
                shares: 1,
              })),
            }),
            expense({
              id: 'settlement',
              title: 'Settlement',
              amount: 85000,
              paidBy: participants[0],
              paidFor: [{ participant: participants[1], shares: 1 }],
              isReimbursement: true,
            }),
          ],
        }),
      ],
      [{ groupId: 'group', participantId: 'you' }],
    )

    expect(dashboard.groups[0].myBalance).toBe(0)
    expect(dashboard.totals.net).toEqual([])
  })
})
