'use client'

import { EmptyState, PageHeader } from '@/components/ledger-ui'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackPage } from '@/lib/analytics/track-page'
import { formatDate } from '@/lib/utils'
import dayjs from 'dayjs'
import { Activity, Clock3 } from 'lucide-react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { useMemo } from 'react'
import { usePersonalDashboardData } from '../personal-data-client'

function actionLabel(action: string) {
  switch (action) {
    case 'CREATE_EXPENSE':
      return 'added'
    case 'UPDATE_EXPENSE':
      return 'edited'
    case 'DELETE_EXPENSE':
      return 'deleted'
    case 'UPDATE_GROUP':
      return 'updated'
    default:
      return action.toLocaleLowerCase()
  }
}

function activityBucket(time: Date) {
  const date = dayjs(time)
  const today = dayjs()
  if (date.isSame(today, 'day')) return 'Today'
  if (date.isSame(today.subtract(1, 'day'), 'day')) return 'Yesterday'
  if (date.isAfter(today.subtract(7, 'day'))) return 'This week'
  return 'Earlier'
}

export function ActivityClient() {
  const locale = useLocale()
  const { data, isLoading, isLocalStorageReady } = usePersonalDashboardData()
  const loading = isLoading || !isLocalStorageReady
  const groupedActivity = useMemo(() => {
    const activity = data?.dashboard.activity ?? []
    return activity.reduce<Record<string, typeof activity>>((groups, item) => {
      const bucket = activityBucket(item.time)
      groups[bucket] = groups[bucket] ?? []
      groups[bucket].push(item)
      return groups
    }, {})
  }, [data?.dashboard.activity])
  const activity = data?.dashboard.activity ?? []

  return (
    <main className="flex flex-col gap-7">
      <TrackPage path="/activity" />
      <PageHeader
        eyebrow="Timeline"
        title="Activity"
        description="Recorded changes from your recent groups. Computed expenses are shown elsewhere; this feed only shows logged actions."
      />

      <section className="ledger-surface rounded-[1.5rem] p-3 sm:p-5">
        {loading ? (
          <div className="grid gap-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : activity.length > 0 ? (
          <div className="grid gap-7">
            {['Today', 'Yesterday', 'This week', 'Earlier']
              .filter((bucket) => groupedActivity[bucket]?.length)
              .map((bucket) => (
                <section key={bucket}>
                  <h2 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                    {bucket}
                  </h2>
                  <div className="relative grid gap-1 before:absolute before:bottom-3 before:left-[1.4rem] before:top-3 before:w-px before:bg-border">
                    {groupedActivity[bucket].map((item) => (
                      <Link
                        key={item.id}
                        href={`/groups/${item.groupId}/activity`}
                        className="ledger-list-row relative grid grid-cols-[auto_minmax(0,1fr)] gap-3"
                      >
                        <div className="z-10 flex h-11 w-11 items-center justify-center rounded-full border bg-card text-primary">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm">
                            <span className="font-black">
                              {item.actorName ?? 'Someone'}
                            </span>{' '}
                            {actionLabel(item.action)}{' '}
                            <span className="font-black">
                              {item.entity ?? item.groupName}
                            </span>
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {item.groupName} ·{' '}
                            {formatDate(item.time, locale, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        ) : (
          <EmptyState
            icon={Clock3}
            title="Your shared money activity will appear here."
            description="Activity is shown when groups record created, edited, or deleted expenses."
          />
        )}
      </section>
    </main>
  )
}
