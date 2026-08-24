'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { appConfig } from '@/config/app'
import { TrackPage } from '@/lib/analytics/track-page'
import { CurrencyAmount } from '@/lib/splitmate/personal-ledger'
import {
  cn,
  formatCurrency,
  formatDateOnly,
  getCurrencyFromGroup,
} from '@/lib/utils'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  Plus,
  Search,
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

function AmountList({
  amounts,
  fallback = 'Settled',
  positive = false,
}: {
  amounts: CurrencyAmount[]
  fallback?: string
  positive?: boolean
}) {
  const locale = useLocale()
  if (amounts.length === 0) {
    return <span className="text-muted-foreground">{fallback}</span>
  }
  return (
    <span
      className={cn(
        'grid gap-1 tabular-nums',
        positive && 'text-emerald-600 dark:text-emerald-400',
      )}
    >
      {amounts.map((amount) => (
        <span key={amount.currencyCode ?? amount.currency}>
          {formatCurrency(getCurrencyFromGroup(amount), amount.amount, locale)}
        </span>
      ))}
    </span>
  )
}

function BalanceCard({
  title,
  amounts,
  tone,
}: {
  title: string
  amounts: CurrencyAmount[]
  tone: 'owed' | 'owe' | 'net'
}) {
  const Icon = tone === 'owe' ? ArrowDownLeft : ArrowUpRight
  return (
    <Card className="overflow-hidden border bg-card/90 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon
          className={cn(
            'h-4 w-4',
            tone === 'owe' ? 'text-red-500' : 'text-emerald-500',
          )}
        />
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'text-2xl font-semibold tracking-normal',
            tone === 'owe' && 'text-red-600 dark:text-red-400',
            tone !== 'owe' && 'text-emerald-600 dark:text-emerald-400',
          )}
        >
          <AmountList amounts={amounts} positive={tone !== 'owe'} />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardClient() {
  const locale = useLocale()
  const { data, isLoading, isLocalStorageReady, displayName, activeGroups } =
    usePersonalDashboardData()
  const dashboard = data?.dashboard
  const loading = isLoading || !isLocalStorageReady

  return (
    <main className="flex flex-col gap-6">
      <TrackPage path="/" />
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            {appConfig.tagline}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal sm:text-4xl">
            {greeting()}
            {displayName ? `, ${displayName}` : ''} 👋
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Your balances, friends, groups, and recent expense activity in one
            place.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/groups">
              <Search className="mr-2 h-4 w-4" />
              Browse
            </Link>
          </Button>
          <Button asChild>
            <Link href="/groups/create">
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Link>
          </Button>
        </div>
      </section>

      {!loading && activeGroups.length === 0 ? (
        <Card className="border-dashed bg-card/70">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <WalletCards className="h-10 w-10 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Start with a group</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Open or create a shared group, choose who you are in that group,
                and your dashboard will become personal.
              </p>
            </div>
            <Button asChild>
              <Link href="/groups/create">Create a group</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-xl" />
              ))
            ) : (
              <>
                <BalanceCard
                  title="You are owed"
                  amounts={dashboard?.totals.owed ?? []}
                  tone="owed"
                />
                <BalanceCard
                  title="You owe"
                  amounts={dashboard?.totals.owe ?? []}
                  tone="owe"
                />
                <BalanceCard
                  title="Net balance"
                  amounts={dashboard?.totals.net ?? []}
                  tone="net"
                />
              </>
            )}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Friends</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/friends">View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="grid gap-3">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-16 rounded-lg" />
                  ))
                ) : dashboard && dashboard.friends.length > 0 ? (
                  dashboard.friends.slice(0, 5).map((friend) => (
                    <Link
                      key={friend.key}
                      href={`/friends/${encodeURIComponent(friend.key)}`}
                      className="flex items-center justify-between rounded-lg border bg-background p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {friend.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{friend.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {friend.sharedGroups.length} shared group
                            {friend.sharedGroups.length === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm font-medium">
                        <AmountList amounts={friend.balances} />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <Users className="mx-auto mb-3 h-8 w-8 text-primary" />
                    <h3 className="font-semibold">
                      Expenses are better with friends.
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Friends appear here when you share expenses in a group.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/activity">View feed</Link>
                </Button>
              </CardHeader>
              <CardContent className="grid gap-3">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 rounded-lg" />
                  ))
                ) : dashboard && dashboard.expenses.length > 0 ? (
                  dashboard.expenses.slice(0, 6).map((expense) => (
                    <Link
                      key={expense.id}
                      href={`/groups/${expense.groupId}/expenses/${expense.id}/edit`}
                      className="flex items-start justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
                    >
                      <div>
                        <div className="font-medium">{expense.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {expense.groupName} · paid by {expense.paidByName}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-semibold tabular-nums">
                          {formatCurrency(
                            getCurrencyFromGroup(expense),
                            expense.amount,
                            locale,
                          )}
                        </div>
                        <div
                          className={cn(
                            'text-xs tabular-nums',
                            expense.relationshipAmount >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400',
                          )}
                        >
                          {expense.relationshipAmount >= 0
                            ? 'You lent '
                            : 'You borrowed '}
                          {formatCurrency(
                            getCurrencyFromGroup(expense),
                            Math.abs(expense.relationshipAmount),
                            locale,
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <Clock3 className="mx-auto mb-3 h-8 w-8 text-primary" />
                    <h3 className="font-semibold">Nothing here yet.</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your shared expense activity will appear here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Groups with activity</h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/groups">Manage groups</Link>
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {loading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-36 rounded-xl" />
                  ))
                : dashboard?.groups.slice(0, 6).map((group) => (
                    <Link
                      key={group.id}
                      href={`/groups/${group.id}`}
                      className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold">{group.name}</h3>
                        <span
                          className={cn(
                            'text-sm font-semibold tabular-nums',
                            group.myBalance >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400',
                          )}
                        >
                          {group.myBalance >= 0 ? '+' : '-'}
                          {formatCurrency(
                            getCurrencyFromGroup(group),
                            Math.abs(group.myBalance),
                            locale,
                          )}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                        <span>{group.memberCount} members</span>
                        <span className="text-right">
                          {group.latestActivityAt
                            ? formatDateOnly(group.latestActivityAt, locale, {
                                dateStyle: 'medium',
                              })
                            : 'No activity'}
                        </span>
                        <span>
                          Total spent{' '}
                          {formatCurrency(
                            getCurrencyFromGroup(group),
                            group.totalSpent,
                            locale,
                          )}
                        </span>
                        <span className="text-right">
                          My share{' '}
                          {formatCurrency(
                            getCurrencyFromGroup(group),
                            group.myShare,
                            locale,
                          )}
                        </span>
                      </div>
                    </Link>
                  ))}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
