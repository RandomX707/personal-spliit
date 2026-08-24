'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackPage } from '@/lib/analytics/track-page'
import { CurrencyAmount } from '@/lib/splitmate/personal-ledger'
import {
  cn,
  formatCurrency,
  formatDateOnly,
  getCurrencyFromGroup,
} from '@/lib/utils'
import { Plus, Users } from 'lucide-react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { usePersonalDashboardData } from '../personal-data-client'

function BalanceText({ balances }: { balances: CurrencyAmount[] }) {
  const locale = useLocale()
  if (balances.length === 0)
    return <span className="text-muted-foreground">settled up</span>
  return (
    <span className="grid gap-1">
      {balances.map((balance) => {
        const positive = balance.amount > 0
        return (
          <span
            key={balance.currencyCode ?? balance.currency}
            className={cn(
              'font-semibold tabular-nums',
              positive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400',
            )}
          >
            {positive ? 'owes you ' : 'you owe '}
            {formatCurrency(
              getCurrencyFromGroup(balance),
              Math.abs(balance.amount),
              locale,
            )}
          </span>
        )
      })}
    </span>
  )
}

export function FriendsClient() {
  const locale = useLocale()
  const { data, isLoading, isLocalStorageReady } = usePersonalDashboardData()
  const loading = isLoading || !isLocalStorageReady
  const friends = data?.dashboard.friends ?? []

  return (
    <main className="flex flex-col gap-6">
      <TrackPage path="/friends" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Friends</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            People you share expenses with, derived from your existing groups.
          </p>
        </div>
        <Button asChild>
          <Link href="/groups/create">
            <Plus className="mr-2 h-4 w-4" />
            Add friend expense
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : friends.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {friends.map((friend) => (
            <Link
              key={friend.key}
              href={`/friends/${encodeURIComponent(friend.key)}`}
            >
              <Card className="h-full transition-colors hover:bg-accent">
                <CardContent className="flex h-full flex-col gap-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {friend.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="font-semibold">{friend.name}</h2>
                        <p className="text-xs text-muted-foreground">
                          {friend.sharedGroups.length} shared group
                          {friend.sharedGroups.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      {friend.lastActivityAt
                        ? `Last activity ${formatDateOnly(
                            friend.lastActivityAt,
                            locale,
                            {
                              dateStyle: 'medium',
                            },
                          )}`
                        : 'No activity yet'}
                    </div>
                    <div className="text-right text-sm">
                      <BalanceText balances={friend.balances} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Users className="h-10 w-10 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">
                Expenses are better with friends.
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Add people to a group and choose your identity there to build
                your friends list.
              </p>
            </div>
            <Button asChild>
              <Link href="/groups/create">Create a group</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
