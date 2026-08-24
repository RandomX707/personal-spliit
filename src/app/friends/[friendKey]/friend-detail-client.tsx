'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackPage } from '@/lib/analytics/track-page'
import {
  cn,
  formatCurrency,
  formatDateOnly,
  getCurrencyFromGroup,
} from '@/lib/utils'
import { ArrowLeft, CheckCircle2, Plus, ReceiptIndianRupee } from 'lucide-react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { useMemo } from 'react'
import { usePersonalDashboardData } from '../../personal-data-client'

export function FriendDetailClient({ friendKey }: { friendKey: string }) {
  const locale = useLocale()
  const { data, isLoading, isLocalStorageReady } = usePersonalDashboardData()
  const loading = isLoading || !isLocalStorageReady
  const friend = data?.dashboard.friends.find((item) => item.key === friendKey)
  const expenses = useMemo(
    () =>
      data?.dashboard.expenses.filter((expense) =>
        friend?.sharedGroups.some((group) => group.id === expense.groupId),
      ) ?? [],
    [data, friend],
  )

  return (
    <main className="flex flex-col gap-6">
      <TrackPage path={`/friends/${friendKey}`} />
      <Button asChild variant="ghost" className="w-fit px-0">
        <Link href="/friends">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Friends
        </Link>
      </Button>

      {loading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : friend ? (
        <>
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                  {friend.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-normal">
                    {friend.name}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {friend.sharedGroups.length} shared group
                    {friend.sharedGroups.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/groups">Settle Up</Link>
                </Button>
                <Button asChild>
                  <Link href="/groups/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </Link>
                </Button>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {friend.balances.length === 0 ? (
                <div className="rounded-xl border bg-background p-4">
                  <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-500" />
                  <div className="text-lg font-semibold">Settled up</div>
                  <p className="text-sm text-muted-foreground">
                    No open balance.
                  </p>
                </div>
              ) : (
                friend.balances.map((balance) => (
                  <div
                    key={balance.currencyCode ?? balance.currency}
                    className="rounded-xl border bg-background p-4"
                  >
                    <div className="text-sm text-muted-foreground">
                      {balance.amount > 0 ? 'They owe you' : 'You owe'}
                    </div>
                    <div
                      className={cn(
                        'mt-1 text-2xl font-semibold tabular-nums',
                        balance.amount > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      {formatCurrency(
                        getCurrencyFromGroup(balance),
                        Math.abs(balance.amount),
                        locale,
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
            <Card>
              <CardHeader>
                <CardTitle>Shared groups</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {friend.sharedGroups.map((group) => (
                  <Button
                    key={group.id}
                    asChild
                    variant="outline"
                    className="justify-start"
                  >
                    <Link href={`/groups/${group.id}`}>{group.name}</Link>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent transactions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {expenses.length > 0 ? (
                  expenses.slice(0, 12).map((expense) => (
                    <Link
                      key={expense.id}
                      href={`/groups/${expense.groupId}/expenses/${expense.id}/edit`}
                      className="flex items-center justify-between gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <ReceiptIndianRupee className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{expense.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {expense.groupName} ·{' '}
                            {formatDateOnly(expense.expenseDate, locale, {
                              dateStyle: 'medium',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm font-semibold tabular-nums">
                        {formatCurrency(
                          getCurrencyFromGroup(expense),
                          expense.amount,
                          locale,
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No transactions found.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <h1 className="text-xl font-semibold">Friend not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This friend may no longer be in your recent groups.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
