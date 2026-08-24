import { ActivityType, SplitMode } from '@/generated/prisma/browser'
import { getBalances } from '@/lib/balances'
import { getCurrencyFromGroup } from '@/lib/utils'
import { getExpenseShares, getParticipantShare } from '../shares'

export type LedgerPerson = {
  id: string
  displayName: string
  avatar: string | null
  upiId: string | null
}

export type LedgerParticipant = {
  id: string
  name: string
  personId?: string | null
  person?: LedgerPerson | null
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
  directGroup?: { id: string } | null
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

export type ParticipantIdentity = {
  groupId: string
  groupName: string
  participantId: string
  participantName: string
  personId: string | null
  personName: string
  isCurrentUser: boolean
}

export type PersonalDashboard = {
  profileName: string | null
  profilePersonId: string | null
  totals: {
    owed: CurrencyAmount[]
    owe: CurrencyAmount[]
    net: CurrencyAmount[]
  }
  friends: FriendSummary[]
  groups: GroupSummary[]
  activity: ActivitySummary[]
  expenses: ExpenseSummary[]
  participantIdentities: ParticipantIdentity[]
}

export type FriendSummary = {
  key: string
  personId: string | null
  name: string
  avatar: string | null
  upiId: string | null
  balances: CurrencyAmount[]
  sharedGroups: {
    id: string
    name: string
    currentParticipantId: string
    friendParticipantId: string
    currency: string
    currencyCode: string | null
  }[]
  participants: ParticipantIdentity[]
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
  isDirect: boolean
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
  if (amount === 0) return
  const key = currencyKey(currency)
  const existing = map.get(key)
  if (existing) {
    existing.amount += amount
  } else {
    map.set(key, { ...currency, amount })
  }
}

function participantPersonKey(groupId: string, participant: LedgerParticipant) {
  // Display names are intentionally excluded from this key. They can change and
  // different people can share a name. Only a persisted Person id can aggregate
  // balances across groups; the fallback is scoped to one participant.
  return participant.personId ?? `participant:${groupId}:${participant.id}`
}

function participantDisplayName(participant: LedgerParticipant) {
  return participant.person?.displayName || participant.name
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

function sortedCurrencyAmounts(map: Map<string, CurrencyAmount>) {
  return [...map.values()]
    .filter(({ amount }) => amount !== 0)
    .sort((a, b) =>
      (a.currencyCode ?? a.currency).localeCompare(
        b.currencyCode ?? b.currency,
      ),
    )
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
  const net = new Map<string, CurrencyAmount>()
  const friends = new Map<
    string,
    {
      personId: string | null
      name: string
      avatar: string | null
      upiId: string | null
      balances: Map<string, CurrencyAmount>
      sharedGroups: Map<string, FriendSummary['sharedGroups'][number]>
      participants: Map<string, ParticipantIdentity>
      lastActivityAt: Date | null
    }
  >()
  const groupSummaries: GroupSummary[] = []
  const activitySummaries: ActivitySummary[] = []
  const expenseSummaries: ExpenseSummary[] = []
  const participantIdentities: ParticipantIdentity[] = []
  let profileName: string | null = null
  let profilePersonId: string | null = null

  for (const group of groups) {
    const activeParticipantId = activeByGroup.get(group.id)
    if (!activeParticipantId) continue

    const activeParticipant = group.participants.find(
      (participant) => participant.id === activeParticipantId,
    )
    if (!activeParticipant) continue

    const activePersonKey = participantPersonKey(group.id, activeParticipant)
    profileName ??= participantDisplayName(activeParticipant)
    profilePersonId ??= activeParticipant.personId ?? null

    const currency = {
      currency: group.currency,
      currencyCode: group.currencyCode,
    }
    const balances = getBalances(toBalanceExpense(group))
    const myBalance = balances[activeParticipantId]?.total ?? 0
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
      isDirect: !!group.directGroup,
    })

    for (const participant of group.participants) {
      const key = participantPersonKey(group.id, participant)
      const identity: ParticipantIdentity = {
        groupId: group.id,
        groupName: group.name,
        participantId: participant.id,
        participantName: participant.name,
        personId: participant.personId ?? null,
        personName: participantDisplayName(participant),
        isCurrentUser: key === activePersonKey,
      }
      participantIdentities.push(identity)

      if (key === activePersonKey) continue

      const friend = friends.get(key) ?? {
        personId: participant.personId ?? null,
        name: participantDisplayName(participant),
        avatar: participant.person?.avatar ?? null,
        upiId: participant.person?.upiId ?? null,
        balances: new Map<string, CurrencyAmount>(),
        sharedGroups: new Map<string, FriendSummary['sharedGroups'][number]>(),
        participants: new Map<string, ParticipantIdentity>(),
        lastActivityAt: null,
      }
      friend.participants.set(participant.id, identity)
      friend.sharedGroups.set(group.id, {
        id: group.id,
        name: group.name,
        currentParticipantId: activeParticipant.id,
        friendParticipantId: participant.id,
        currency: group.currency,
        currencyCode: group.currencyCode,
      })
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
      const paidByKey = participantPersonKey(group.id, expense.paidBy)
      const myShare = shareMap.get(activeParticipantId) ?? 0
      const isInvolved =
        paidByKey === activePersonKey || shareMap.has(activeParticipantId)

      if (paidByKey === activePersonKey) {
        for (const paidFor of expense.paidFor) {
          const participant = paidFor.participant
          const friendKey = participantPersonKey(group.id, participant)
          if (friendKey === activePersonKey) continue
          const friend = friends.get(friendKey)
          if (!friend) continue
          addCurrencyAmount(
            friend.balances,
            currency,
            shareMap.get(participant.id) ?? 0,
          )
        }
      } else if (myShare !== 0) {
        const friend = friends.get(paidByKey)
        if (friend) addCurrencyAmount(friend.balances, currency, -myShare)
      }

      if (isInvolved) {
        const relationshipAmount =
          paidByKey === activePersonKey ? expense.amount - myShare : -myShare
        expenseSummaries.push({
          id: expense.id,
          groupId: group.id,
          groupName: group.name,
          title: expense.title,
          amount: expense.amount,
          currency: group.currency,
          currencyCode: group.currencyCode,
          categoryName: expense.category?.name ?? null,
          paidByName: participantDisplayName(expense.paidBy),
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

  const owed = new Map<string, CurrencyAmount>()
  const owe = new Map<string, CurrencyAmount>()
  for (const friend of friends.values()) {
    for (const balance of friend.balances.values()) {
      if (balance.amount > 0) addCurrencyAmount(owed, balance, balance.amount)
      if (balance.amount < 0) addCurrencyAmount(owe, balance, -balance.amount)
    }
  }

  return {
    profileName,
    profilePersonId,
    totals: {
      owed: sortedCurrencyAmounts(owed),
      owe: sortedCurrencyAmounts(owe),
      net: sortedCurrencyAmounts(net),
    },
    friends: [...friends.entries()]
      .map(([key, friend]) => ({
        key,
        personId: friend.personId,
        name: friend.name,
        avatar: friend.avatar,
        upiId: friend.upiId,
        balances: sortedCurrencyAmounts(friend.balances),
        sharedGroups: [...friend.sharedGroups.values()],
        participants: [...friend.participants.values()],
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
    groups: groupSummaries
      .filter((group) => !group.isDirect)
      .sort((a, b) => {
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
    participantIdentities,
  }
}

export function describeCurrencyGroup(currency: CurrencyAmount) {
  return getCurrencyFromGroup(currency)
}
