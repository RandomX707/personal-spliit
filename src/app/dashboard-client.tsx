'use client'

import {
  BalanceTone,
  EmptyState,
  InitialAvatar,
  LedgerAmount,
  PageHeader,
  SectionHeader,
} from '@/components/ledger-ui'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { appConfig } from '@/config/app'
import { TrackPage } from '@/lib/analytics/track-page'
import { CurrencyAmount } from '@/lib/splitmate/personal-ledger'
import { formatDateOnly } from '@/lib/utils'
import {
  ArrowRight,
  Clock3,
  Plus,
  Scale,
  Users,
  WalletCards,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { usePersonalDashboardData } from './personal-data-client'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function findCurrencyAmount(amounts: CurrencyAmount[], target: CurrencyAmount) {
  return (
    amounts.find(
      (amount) =>
        (amount.currencyCode ?? amount.currency) ===
        (target.currencyCode ?? target.currency),
    )?.amount ?? 0
  )
}

function BalanceHero({
  net,
  owed,
  owe,
  loading,
}: {
  net: CurrencyAmount[]
  owed: CurrencyAmount[]
  owe: CurrencyAmount[]
  loading: boolean
}) {
  const locale = useLocale()
  const currencies: CurrencyAmount[] =
    net.length > 0
      ? net
      : [...owed, ...owe].filter(
          (amount, index, source) =>
            source.findIndex(
              (item) =>
                (item.currencyCode ?? item.currency) ===
                (amount.currencyCode ?? amount.currency),
            ) === index,
        )

  return (
    <section className="ledger-surface overflow-hidden rounded-[2rem] p-5 sm:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
            Your balance
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-6xl">
            {loading ? (
              <Skeleton className="h-14 w-56 rounded-2xl" />
            ) : currencies.length === 1 ? (
              <BalanceTone amount={currencies[0].amount}>
                <LedgerAmount
                  amount={currencies[0].amount}
                  currency={currencies[0]}
                  locale={locale}
                  signed
                />
              </BalanceTone>
            ) : (
              'Multiple currencies'
            )}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {loading
              ? 'Loading your money picture.'
              : currencies.length === 0
                ? 'Nothing to settle yet.'
                : currencies.length === 1
                  ? currencies[0].amount > 0
                    ? "Overall, you're owed money."
                    : currencies[0].amount < 0
                      ? 'Overall, you owe money.'
                      : "You're settled up."
                  : 'Balances are shown separately. LEDGER never combines currencies without a real conversion rate.'}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
          {loading
            ? Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-3xl" />
              ))
            : currencies.map((currency) => (
                <div
                  key={currency.currencyCode ?? currency.currency}
                  className="rounded-3xl border bg-surface-elevated p-4"
                >
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                    {currency.currencyCode ?? currency.currency}
                  </div>
                  <BalanceTone
                    amount={currency.amount}
                    className="mt-2 block text-2xl font-black"
                  >
                    <LedgerAmount
                      amount={currency.amount}
                      currency={currency}
                      locale={locale}
                      signed
                    />
                  </BalanceTone>
                  <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                    <span>
                      Owed to you:{' '}
                      <LedgerAmount
                        amount={findCurrencyAmount(owed, currency)}
                        currency={currency}
                        locale={locale}
                      />
                    </span>
                    <span>
                      You owe:{' '}
                      <LedgerAmount
                        amount={findCurrencyAmount(owe, currency)}
                        currency={currency}
                        locale={locale}
                      />
                    </span>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </section>
  )
}

export function DashboardClient() {
  const locale = useLocale()
  const { data, isLoading, isLocalStorageReady, displayName, activeGroups } =
    usePersonalDashboardData()
  const dashboard = data?.dashboard
  const loading = isLoading || !isLocalStorageReady

  return (
    <main className="flex flex-col gap-7">
      <TrackPage path="/" />
      <PageHeader
        eyebrow={appConfig.name}
        title={`${greeting()}${displayName ? `, ${displayName}` : ''}`}
        description={appConfig.tagline}
        action={
          <div className="hidden gap-2 sm:flex">
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/groups">
                <WalletCards className="mr-2 h-4 w-4" />
                Groups
              </Link>
            </Button>
            <Button asChild className="rounded-2xl font-bold">
              <Link href="/friends">
                <Plus className="mr-2 h-4 w-4" />
                New expense
              </Link>
            </Button>
          </div>
        }
      />

      {!loading && activeGroups.length === 0 ? (
        <EmptyState
          icon={WalletCards}
          title="Nothing to settle yet."
          description="Create or open a group, choose who you are, and LEDGER will build your personal overview."
          action={
            <Button asChild className="rounded-2xl">
              <Link href="/groups/create">Create a group</Link>
            </Button>
          }
        />
      ) : (
        <>
          <BalanceHero
            loading={loading}
            net={dashboard?.totals.net ?? []}
            owed={dashboard?.totals.owed ?? []}
            owe={dashboard?.totals.owe ?? []}
          />

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-6">
              <div>
                <SectionHeader title="Recent activity" actionHref="/activity" />
                <div className="ledger-surface rounded-[1.5rem] p-2">
                  {loading ? (
                    <div className="grid gap-1">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="h-16 rounded-2xl" />
                      ))}
                    </div>
                  ) : dashboard && dashboard.expenses.length > 0 ? (
                    <div className="grid gap-1">
                      {dashboard.expenses.slice(0, 8).map((expense) => (
                        <Link
                          key={expense.id}
                          href={`/groups/${expense.groupId}/expenses/${expense.id}/edit`}
                          className="ledger-list-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-bold">
                              {expense.title}
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">
                              Paid by {expense.paidByName} ·{' '}
                              {formatDateOnly(expense.expenseDate, locale, {
                                dateStyle: 'medium',
                              })}{' '}
                              · {expense.groupName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black">
                              <LedgerAmount
                                amount={expense.amount}
                                currency={expense}
                                locale={locale}
                              />
                            </div>
                            <BalanceTone
                              amount={expense.relationshipAmount}
                              className="text-xs font-bold"
                            >
                              {expense.relationshipAmount >= 0
                                ? 'you lent '
                                : 'you owe '}
                              <LedgerAmount
                                amount={Math.abs(expense.relationshipAmount)}
                                currency={expense}
                                locale={locale}
                              />
                            </BalanceTone>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Clock3}
                      title="Your shared money activity will appear here."
                      description="Add an expense and LEDGER will keep the timeline readable."
                    />
                  )}
                </div>
              </div>

              <div>
                <SectionHeader title="Groups" actionHref="/groups" />
                <div className="grid gap-3 md:grid-cols-2">
                  {loading
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-32 rounded-3xl" />
                      ))
                    : dashboard?.groups.slice(0, 4).map((group) => (
                        <Link
                          key={group.id}
                          href={`/groups/${group.id}`}
                          className="ledger-surface rounded-[1.5rem] p-4 transition-colors hover:bg-accent/60"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-lg font-black">
                                {group.name}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {group.memberCount} people · total{' '}
                                <LedgerAmount
                                  amount={group.totalSpent}
                                  currency={group}
                                  locale={locale}
                                />
                              </p>
                            </div>
                            <BalanceTone
                              amount={group.myBalance}
                              className="font-black"
                            >
                              <LedgerAmount
                                amount={group.myBalance}
                                currency={group}
                                locale={locale}
                                signed
                              />
                            </BalanceTone>
                          </div>
                          <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              Your share{' '}
                              <LedgerAmount
                                amount={group.myShare}
                                currency={group}
                                locale={locale}
                              />
                            </span>
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </Link>
                      ))}
                </div>
              </div>
            </div>

            <aside className="grid content-start gap-6">
              <div>
                <SectionHeader title="Friends" actionHref="/friends" />
                <div className="ledger-surface rounded-[1.5rem] p-2">
                  {loading ? (
                    <div className="grid gap-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton key={index} className="h-14 rounded-2xl" />
                      ))}
                    </div>
                  ) : dashboard && dashboard.friends.length > 0 ? (
                    dashboard.friends.slice(0, 6).map((friend) => (
                      <Link
                        key={friend.key}
                        href={`/friends/${encodeURIComponent(friend.key)}`}
                        className="ledger-list-row flex items-center justify-between gap-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <InitialAvatar
                            name={friend.name}
                            avatar={friend.avatar}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-bold">
                              {friend.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {friend.sharedGroups.length} shared group
                              {friend.sharedGroups.length === 1 ? '' : 's'}
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-1 text-right text-sm font-black">
                          {friend.balances.length === 0 ? (
                            <span className="text-balance-neutral">
                              Settled
                            </span>
                          ) : (
                            friend.balances.map((balance) => (
                              <BalanceTone
                                key={balance.currencyCode ?? balance.currency}
                                amount={balance.amount}
                              >
                                <LedgerAmount
                                  amount={balance.amount}
                                  currency={balance}
                                  locale={locale}
                                  signed
                                />
                              </BalanceTone>
                            ))
                          )}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <EmptyState
                      icon={Users}
                      title="Your people will show up here."
                      description="Friends appear after you identify yourself in shared groups."
                    />
                  )}
                </div>
              </div>

              <div className="ledger-surface rounded-[1.5rem] p-5">
                <SectionHeader title="Quick actions" />
                <div className="grid gap-2">
                  <Button asChild className="justify-between rounded-2xl">
                    <Link href="/friends">
                      New expense <Plus className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="justify-between rounded-2xl"
                  >
                    <Link href="/groups/create">
                      New group <WalletCards className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="justify-between rounded-2xl"
                  >
                    <Link href="/groups">
                      Settle up <Scale className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </aside>
          </section>
        </>
      )}
    </main>
  )
}
