import { ActivityType, SplitMode } from '@/generated/prisma/browser'
import { getBalances } from '@/lib/balances'
import { getCurrencyFromGroup } from '@/lib/utils'
import { getExpenseShares, getParticipantShare } from '../shares'

export type LedgerParticipant = {
  id: string
  name: string
}

export type LedgerGroup = {
  id: string
  name: string
  currency: string
  currencyCode: string | null
  createdAt: Date
  participants: LedgerParticipant[]
  expenses: LedgerExpense[]
  activities: LedgerActivity[]
}

export type LedgerExpense = {
  id: string
  title: string
  amount: number
  expenseDate: Date
  createdAt: Date
  isReimbursement: boolean
  splitMode: SplitMode
  category: { id: number; name: string; grouping: string } | null
  paidBy: LedgerParticipant
  paidFor: { participant: LedgerParticipant; shares: number }[]
  _count?: { documents: number }
}

export type LedgerActivity = {
  id: string
  time: Date
  activityType: ActivityType
  participantId: string | null
  expenseId: string | null
  data: string | null
}

export type ActiveUserGroup = {
  groupId: string
  participantId: string
}

export type CurrencyAmount = {
  currency: string
  currencyCode: string | null
  amount: number
}

export type PersonalDashboard = {
  profileName: string | null
  totals: {
    owed: CurrencyAmount[]
    owe: CurrencyAmount[]
    net: CurrencyAmount[]
  }
  friends: FriendSummary[]
  groups: GroupSummary[]
  activity: ActivitySummary[]
  expenses: ExpenseSummary[]
}

export type FriendSummary = {
  key: string
  name: string
  balances: CurrencyAmount[]
  sharedGroups: { id: string; name: string }[]
  lastActivityAt: Date | null
}

export type GroupSummary = {
  id: string
  name: string
  memberCount: number
  currency: string
  currencyCode: string | null
  totalSpent: number
  myPaid: number
  myShare: number
  myBalance: number
  latestActivityAt: Date | null
}

export type ActivitySummary = {
  id: string
  groupId: string
  groupName: string
  actorName: string | null
  action: ActivityType
  entity: string | null
  time: Date
}

export type ExpenseSummary = {
  id: string
  groupId: string
  groupName: string
  title: string
  amount: number
  currency: string
  currencyCode: string | null
  categoryName: string | null
  paidByName: string
  expenseDate: Date
  relationshipAmount: number
  isReimbursement: boolean
}

type GroupExpensesForBalances = Parameters<typeof getBalances>[0]

function currencyKey(
  currency: Pick<CurrencyAmount, 'currency' | 'currencyCode'>,
) {
  return currency.currencyCode || `custom:${currency.currency}`
}

function addCurrencyAmount(
  map: Map<string, CurrencyAmount>,
  currency: Pick<CurrencyAmount, 'currency' | 'currencyCode'>,
  amount: number,
) {
  const key = currencyKey(currency)
  const existing = map.get(key)
  if (existing) {
    existing.amount += amount
  } else {
    map.set(key, { ...currency, amount })
  }
}

function normalizeFriendKey(name: string) {
  return name.trim().toLocaleLowerCase()
}

function toBalanceExpense(group: LedgerGroup): GroupExpensesForBalances {
  return group.expenses.map((expense) => ({
    ...expense,
    paidFor: expense.paidFor.map((paidFor) => ({
      participant: paidFor.participant,
      shares: paidFor.shares,
    })),
  })) as GroupExpensesForBalances
}

export function buildPersonalDashboard(
  groups: LedgerGroup[],
  activeUserGroups: ActiveUserGroup[],
): PersonalDashboard {
  const activeByGroup = new Map(
    activeUserGroups.map(({ groupId, participantId }) => [
      groupId,
      participantId,
    ]),
  )
  const owed = new Map<string, CurrencyAmount>()
  const owe = new Map<string, CurrencyAmount>()
  const net = new Map<string, CurrencyAmount>()
  const friends = new Map<
    string,
    {
      name: string
      balances: Map<string, CurrencyAmount>
      sharedGroups: Map<string, { id: string; name: string }>
      lastActivityAt: Date | null
    }
  >()
  const groupSummaries: GroupSummary[] = []
  const activitySummaries: ActivitySummary[] = []
  const expenseSummaries: ExpenseSummary[] = []
  let profileName: string | null = null

  for (const group of groups) {
    const activeParticipantId = activeByGroup.get(group.id)
    if (!activeParticipantId) continue

    const activeParticipant = group.participants.find(
      (participant) => participant.id === activeParticipantId,
    )
    if (!activeParticipant) continue
    profileName ??= activeParticipant.name

    const currency = {
      currency: group.currency,
      currencyCode: group.currencyCode,
    }
    const balances = getBalances(toBalanceExpense(group))
    const myBalance = balances[activeParticipantId]?.total ?? 0
    if (myBalance > 0) addCurrencyAmount(owed, currency, myBalance)
    if (myBalance < 0) addCurrencyAmount(owe, currency, Math.abs(myBalance))
    addCurrencyAmount(net, currency, myBalance)

    const nonSettlementExpenses = group.expenses.filter(
      (expense) => !expense.isReimbursement,
    )
    const latestActivityAt =
      group.activities[0]?.time ??
      group.expenses
        .map((expense) => expense.createdAt)
        .sort((a, b) => b.getTime() - a.getTime())[0] ??
      null

    groupSummaries.push({
      id: group.id,
      name: group.name,
      memberCount: group.participants.length,
      currency: group.currency,
      currencyCode: group.currencyCode,
      totalSpent: nonSettlementExpenses.reduce(
        (sum, expense) => sum + Math.max(expense.amount, 0),
        0,
      ),
      myPaid: nonSettlementExpenses.reduce(
        (sum, expense) =>
          sum +
          (expense.paidBy.id === activeParticipantId ? expense.amount : 0),
        0,
      ),
      myShare: nonSettlementExpenses.reduce(
        (sum, expense) =>
          sum +
          getParticipantShare(activeParticipantId, {
            id: expense.id,
            amount: expense.amount,
            splitMode: expense.splitMode,
            paidFor: expense.paidFor.map((paidFor) => ({
              participantId: paidFor.participant.id,
              shares: paidFor.shares,
            })),
          }),
        0,
      ),
      myBalance,
      latestActivityAt,
    })

    for (const participant of group.participants) {
      if (participant.id === activeParticipantId) continue
      const key = normalizeFriendKey(participant.name)
      const friend = friends.get(key) ?? {
        name: participant.name,
        balances: new Map<string, CurrencyAmount>(),
        sharedGroups: new Map<string, { id: string; name: string }>(),
        lastActivityAt: null,
      }
      friend.sharedGroups.set(group.id, { id: group.id, name: group.name })
      if (
        latestActivityAt &&
        (!friend.lastActivityAt || latestActivityAt > friend.lastActivityAt)
      ) {
        friend.lastActivityAt = latestActivityAt
      }
      friends.set(key, friend)
    }

    for (const expense of group.expenses) {
      const shareMap = getExpenseShares({
        id: expense.id,
        amount: expense.amount,
        splitMode: expense.splitMode,
        paidFor: expense.paidFor.map((paidFor) => ({
          participantId: paidFor.participant.id,
          shares: paidFor.shares,
        })),
      })
      const myShare = shareMap.get(activeParticipantId) ?? 0
      const isInvolved =
        expense.paidBy.id === activeParticipantId ||
        shareMap.has(activeParticipantId)

      for (const paidFor of expense.paidFor) {
        const participant = paidFor.participant
        if (participant.id === activeParticipantId) continue
        const key = normalizeFriendKey(participant.name)
        const friend = friends.get(key)
        if (!friend) continue
        const participantShare = shareMap.get(participant.id) ?? 0
        if (expense.paidBy.id === activeParticipantId) {
          addCurrencyAmount(friend.balances, currency, participantShare)
        } else if (expense.paidBy.id === participant.id && myShare !== 0) {
          addCurrencyAmount(friend.balances, currency, -myShare)
        }
      }

      if (isInvolved) {
        const relationshipAmount =
          expense.paidBy.id === activeParticipantId
            ? expense.amount - myShare
            : -myShare
        expenseSummaries.push({
          id: expense.id,
          groupId: group.id,
          groupName: group.name,
          title: expense.title,
          amount: expense.amount,
          currency: group.currency,
          currencyCode: group.currencyCode,
          categoryName: expense.category?.name ?? null,
          paidByName: expense.paidBy.name,
          expenseDate: expense.expenseDate,
          relationshipAmount,
          isReimbursement: expense.isReimbursement,
        })
      }
    }

    for (const activity of group.activities) {
      activitySummaries.push({
        id: activity.id,
        groupId: group.id,
        groupName: group.name,
        actorName:
          group.participants.find(
            (participant) => participant.id === activity.participantId,
          )?.name ?? null,
        action: activity.activityType,
        entity: activity.data,
        time: activity.time,
      })
    }
  }

  return {
    profileName,
    totals: {
      owed: [...owed.values()].filter(({ amount }) => amount !== 0),
      owe: [...owe.values()].filter(({ amount }) => amount !== 0),
      net: [...net.values()].filter(({ amount }) => amount !== 0),
    },
    friends: [...friends.entries()]
      .map(([key, friend]) => ({
        key,
        name: friend.name,
        balances: [...friend.balances.values()].filter(
          ({ amount }) => amount !== 0,
        ),
        sharedGroups: [...friend.sharedGroups.values()],
        lastActivityAt: friend.lastActivityAt,
      }))
      .sort((a, b) => {
        const totalA = a.balances.reduce(
          (sum, balance) => sum + Math.abs(balance.amount),
          0,
        )
        const totalB = b.balances.reduce(
          (sum, balance) => sum + Math.abs(balance.amount),
          0,
        )
        return totalB - totalA || a.name.localeCompare(b.name)
      }),
    groups: groupSummaries.sort((a, b) => {
      const aTime = a.latestActivityAt?.getTime() ?? a.id.localeCompare(b.id)
      const bTime = b.latestActivityAt?.getTime() ?? b.id.localeCompare(a.id)
      return bTime - aTime
    }),
    activity: activitySummaries
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, 30),
    expenses: expenseSummaries
      .sort((a, b) => b.expenseDate.getTime() - a.expenseDate.getTime())
      .slice(0, 30),
  }
}

export function describeCurrencyGroup(currency: CurrencyAmount) {
  return getCurrencyFromGroup(currency)
}
