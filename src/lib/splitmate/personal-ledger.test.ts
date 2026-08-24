import { ActivityType, SplitMode } from '@/generated/prisma/browser'
import {
  LedgerExpense,
  LedgerGroup,
  LedgerParticipant,
  buildPersonalDashboard,
} from './personal-ledger'

const p = (
  id: string,
  name: string,
  personId = `person-${id}`,
): LedgerParticipant => ({
  id,
  name,
  personId,
  person: {
    id: personId,
    displayName: name,
    avatar: null,
    upiId: null,
  },
})

const you = p('you', 'You', 'person-you')
const rahul = p('rahul', 'Rahul', 'person-rahul')
const priya = p('priya', 'Priya', 'person-priya')
const arjun = p('arjun', 'Arjun', 'person-arjun')
const participants = [you, rahul, priya, arjun]

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
    paidBy: overrides.paidBy ?? you,
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
        id: `activity-${overrides.id ?? 'group'}`,
        time: new Date('2026-08-20T11:00:00.000Z'),
        activityType: ActivityType.CREATE_EXPENSE,
        participantId: 'you',
        expenseId: 'expense',
        data: 'Dinner',
      },
    ],
    directGroup: overrides.directGroup ?? null,
  }
}

describe('LEDGER personal ledger', () => {
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

  it('calculates owed and owe separately instead of deriving them from net', () => {
    const dashboard = buildPersonalDashboard(
      [
        group({
          participants: [you, rahul, priya],
          expenses: [
            expense({
              id: 'rahul-owes',
              amount: 200000,
              paidBy: you,
              paidFor: [you, rahul].map((participant) => ({
                participant,
                shares: 1,
              })),
            }),
            expense({
              id: 'you-owe-priya',
              amount: 140000,
              paidBy: priya,
              paidFor: [you, priya].map((participant) => ({
                participant,
                shares: 1,
              })),
            }),
          ],
        }),
      ],
      [{ groupId: 'group', participantId: 'you' }],
    )

    expect(dashboard.totals.owed).toEqual([
      { currency: '₹', currencyCode: 'INR', amount: 100000 },
    ])
    expect(dashboard.totals.owe).toEqual([
      { currency: '₹', currencyCode: 'INR', amount: 70000 },
    ])
    expect(dashboard.totals.net).toEqual([
      { currency: '₹', currencyCode: 'INR', amount: 30000 },
    ])
  })

  it('keeps currencies in separate dashboard buckets', () => {
    const dashboard = buildPersonalDashboard(
      [
        group({
          id: 'inr',
          currency: '₹',
          currencyCode: 'INR',
          participants: [you, rahul],
          expenses: [
            expense({
              id: 'inr-expense',
              amount: 100000,
              paidFor: [you, rahul].map((participant) => ({
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
          participants: [you, p('john', 'John', 'person-john')],
          expenses: [
            expense({
              id: 'usd-expense',
              amount: 4000,
              paidFor: [you, p('john', 'John', 'person-john')].map(
                (participant) => ({
                  participant,
                  shares: 1,
                }),
              ),
            }),
          ],
        }),
      ],
      [
        { groupId: 'inr', participantId: 'you' },
        { groupId: 'usd', participantId: 'you' },
      ],
    )

    expect(dashboard.totals.owed).toEqual([
      { currency: '₹', currencyCode: 'INR', amount: 50000 },
      { currency: '$', currencyCode: 'USD', amount: 2000 },
    ])
  })

  it('does not merge two unrelated people with the same display name', () => {
    const rahulA = p('rahul-a', 'Rahul', 'person-rahul-a')
    const rahulB = p('rahul-b', 'Rahul', 'person-rahul-b')
    const dashboard = buildPersonalDashboard(
      [
        group({
          id: 'a',
          participants: [you, rahulA],
          expenses: [
            expense({
              id: 'a-expense',
              amount: 100000,
              paidFor: [you, rahulA].map((participant) => ({
                participant,
                shares: 1,
              })),
            }),
          ],
        }),
        group({
          id: 'b',
          participants: [you, rahulB],
          expenses: [
            expense({
              id: 'b-expense',
              amount: 60000,
              paidFor: [you, rahulB].map((participant) => ({
                participant,
                shares: 1,
              })),
            }),
          ],
        }),
      ],
      [
        { groupId: 'a', participantId: 'you' },
        { groupId: 'b', participantId: 'you' },
      ],
    )

    expect(dashboard.friends).toHaveLength(2)
    expect(dashboard.friends.map((friend) => friend.key).sort()).toEqual([
      'person-rahul-a',
      'person-rahul-b',
    ])
  })

  it('combines one explicitly linked person with different display names', () => {
    const linkedA = p('rahul-a', 'Rahul', 'person-rahul')
    const linkedB = p('rahul-b', 'Rahul Kumar', 'person-rahul')
    const dashboard = buildPersonalDashboard(
      [
        group({
          id: 'a',
          participants: [you, linkedA],
          expenses: [
            expense({
              id: 'a-expense',
              amount: 100000,
              paidFor: [you, linkedA].map((participant) => ({
                participant,
                shares: 1,
              })),
            }),
          ],
        }),
        group({
          id: 'b',
          participants: [you, linkedB],
          expenses: [
            expense({
              id: 'b-expense',
              amount: 60000,
              paidFor: [you, linkedB].map((participant) => ({
                participant,
                shares: 1,
              })),
            }),
          ],
        }),
      ],
      [
        { groupId: 'a', participantId: 'you' },
        { groupId: 'b', participantId: 'you' },
      ],
    )

    expect(dashboard.friends).toHaveLength(1)
    expect(dashboard.friends[0].key).toBe('person-rahul')
    expect(dashboard.friends[0].balances).toEqual([
      { currency: '₹', currencyCode: 'INR', amount: 80000 },
    ])
  })

  it('keeps renamed participants attached to the same person', () => {
    const renamedRahul = p('rahul', 'Rahul K', 'person-rahul')
    const dashboard = buildPersonalDashboard(
      [
        group({
          participants: [you, renamedRahul],
          expenses: [
            expense({
              amount: 100000,
              paidFor: [you, renamedRahul].map((participant) => ({
                participant,
                shares: 1,
              })),
            }),
          ],
        }),
      ],
      [{ groupId: 'group', participantId: 'you' }],
    )

    expect(dashboard.friends[0].key).toBe('person-rahul')
    expect(dashboard.friends[0].balances[0].amount).toBe(50000)
  })

  it('separates balances after unlinking identities', () => {
    const linkedA = p('rahul-a', 'Rahul', 'person-rahul')
    const unlinkedB = p('rahul-b', 'Rahul Kumar', 'person-rahul-kumar')
    const dashboard = buildPersonalDashboard(
      [
        group({
          id: 'a',
          participants: [you, linkedA],
          expenses: [
            expense({
              id: 'a-expense',
              amount: 100000,
              paidFor: [you, linkedA].map((participant) => ({
                participant,
                shares: 1,
              })),
            }),
          ],
        }),
        group({
          id: 'b',
          participants: [you, unlinkedB],
          expenses: [
            expense({
              id: 'b-expense',
              amount: 60000,
              paidFor: [you, unlinkedB].map((participant) => ({
                participant,
                shares: 1,
              })),
            }),
          ],
        }),
      ],
      [
        { groupId: 'a', participantId: 'you' },
        { groupId: 'b', participantId: 'you' },
      ],
    )

    expect(dashboard.friends).toHaveLength(2)
    expect(
      dashboard.friends.map((friend) => friend.balances[0].amount).sort(),
    ).toEqual([30000, 50000])
  })

  it('derives friend balances from exact amount split flows', () => {
    const dashboard = buildPersonalDashboard(
      [
        group({
          expenses: [
            expense({
              amount: 100000,
              splitMode: SplitMode.BY_AMOUNT,
              paidFor: [
                { participant: you, shares: 50000 },
                { participant: rahul, shares: 30000 },
                { participant: priya, shares: 20000 },
              ],
            }),
          ],
        }),
      ],
      [{ groupId: 'group', participantId: 'you' }],
    )

    expect(dashboard.groups[0].myBalance).toBe(50000)
    expect(
      dashboard.friends.find((friend) => friend.key === rahul.personId)
        ?.balances,
    ).toEqual([{ currency: '₹', currencyCode: 'INR', amount: 30000 }])
    expect(
      dashboard.friends.find((friend) => friend.key === priya.personId)
        ?.balances,
    ).toEqual([{ currency: '₹', currencyCode: 'INR', amount: 20000 }])
  })

  it('settlements reduce balances through the existing reimbursement model', () => {
    const dashboard = buildPersonalDashboard(
      [
        group({
          participants: [you, rahul],
          expenses: [
            expense({
              id: 'taxi',
              amount: 170000,
              paidBy: rahul,
              paidFor: [you, rahul].map((participant) => ({
                participant,
                shares: 1,
              })),
            }),
            expense({
              id: 'settlement',
              title: 'Settlement',
              amount: 85000,
              paidBy: you,
              paidFor: [{ participant: rahul, shares: 1 }],
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
