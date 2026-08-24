'use client'

import {
  BalanceTone,
  EmptyState,
  InitialAvatar,
  LedgerAmount,
  PageHeader,
} from '@/components/ledger-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackPage } from '@/lib/analytics/track-page'
import { CurrencyAmount } from '@/lib/splitmate/personal-ledger'
import { cn, formatDateOnly } from '@/lib/utils'
import { ChevronRight, Plus, Search, Users } from 'lucide-react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { usePersonalDashboardData } from '../personal-data-client'

type Filter = 'all' | 'owed' | 'owe' | 'settled'

function primaryBalance(balances: CurrencyAmount[]) {
  return balances[0] ?? null
}

function balanceLabel(name: string, balances: CurrencyAmount[]) {
  const balance = primaryBalance(balances)
  if (!balance) return 'Settled'
  if (balances.length > 1) return 'Multiple currencies'
  return balance.amount > 0 ? `${name} owes you` : `You owe ${name}`
}

export function FriendsClient() {
  const locale = useLocale()
  const { data, isLoading, isLocalStorageReady } = usePersonalDashboardData()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const loading = isLoading || !isLocalStorageReady
  const filteredFriends = useMemo(() => {
    const friends = data?.dashboard.friends ?? []
    return friends.filter((friend) => {
      const balance = primaryBalance(friend.balances)
      const matchesSearch = friend.name
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase())
      const matchesFilter =
        filter === 'all' ||
        (filter === 'settled' && !balance) ||
        (filter === 'owed' && !!balance && balance.amount > 0) ||
        (filter === 'owe' && !!balance && balance.amount < 0)
      return matchesSearch && matchesFilter
    })
  }, [data?.dashboard.friends, filter, query])
  const friends = data?.dashboard.friends ?? []

  return (
    <main className="flex flex-col gap-7">
      <TrackPage path="/friends" />
      <PageHeader
        eyebrow="People"
        title="Friends"
        description="Balances with the people you share expenses with. Same names stay separate unless you link them."
        action={
          <Button asChild className="rounded-2xl font-bold">
            <Link href="/groups/create">
              <Plus className="mr-2 h-4 w-4" />
              Create group
            </Link>
          </Button>
        }
      />

      <section className="ledger-surface rounded-[1.5rem] p-3 sm:p-4">
        <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
          <div className="relative md:max-w-sm md:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search friends"
              className="rounded-2xl pl-9"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              ['all', 'All'],
              ['owed', 'Owed to you'],
              ['owe', 'You owe'],
              ['settled', 'Settled'],
            ].map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={filter === value ? 'default' : 'ghost'}
                size="sm"
                className="shrink-0 rounded-full"
                onClick={() => setFilter(value as Filter)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-1 pt-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : filteredFriends.length > 0 ? (
          <div className="grid gap-1 pt-3">
            {filteredFriends.map((friend) => {
              const balance = primaryBalance(friend.balances)
              return (
                <Link
                  key={friend.key}
                  href={`/friends/${encodeURIComponent(friend.key)}`}
                  className="ledger-list-row grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3"
                >
                  <InitialAvatar
                    name={friend.name}
                    avatar={friend.avatar}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-black">{friend.name}</div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {friend.sharedGroups.length} shared group
                      {friend.sharedGroups.length === 1 ? '' : 's'}
                      {friend.lastActivityAt
                        ? ` · ${formatDateOnly(friend.lastActivityAt, locale, {
                            dateStyle: 'medium',
                          })}`
                        : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-muted-foreground">
                      {balanceLabel(friend.name, friend.balances)}
                    </div>
                    <div
                      className={cn(
                        'mt-1 text-sm font-black',
                        !balance && 'text-balance-neutral',
                      )}
                    >
                      {balance ? (
                        <BalanceTone amount={balance.amount}>
                          <LedgerAmount
                            amount={balance.amount}
                            currency={balance}
                            locale={locale}
                            signed
                          />
                        </BalanceTone>
                      ) : (
                        'Settled'
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )
            })}
          </div>
        ) : friends.length > 0 ? (
          <EmptyState
            icon={Search}
            title="No matching friends."
            description="Try a different search or balance filter."
          />
        ) : (
          <EmptyState
            icon={Users}
            title="Your people will show up here."
            description="Add friends as group participants, then choose your identity in that group."
            action={
              <Button asChild className="rounded-2xl">
                <Link href="/groups/create">Create a group</Link>
              </Button>
            }
          />
        )}
      </section>
    </main>
  )
}
