'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackPage } from '@/lib/analytics/track-page'
import { formatDate } from '@/lib/utils'
import { Activity, Clock3 } from 'lucide-react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
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

export function ActivityClient() {
  const locale = useLocale()
  const { data, isLoading, isLocalStorageReady } = usePersonalDashboardData()
  const loading = isLoading || !isLocalStorageReady
  const activity = data?.dashboard.activity ?? []

  return (
    <main className="flex flex-col gap-6">
      <TrackPage path="/activity" />
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Activity</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Recorded changes from your recent groups. Older upstream data appears
          only if it was logged.
        </p>
      </div>

      <Card>
        <CardContent className="p-2">
          {loading ? (
            <div className="grid gap-2 p-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : activity.length > 0 ? (
            <div className="grid gap-1">
              {activity.map((item) => (
                <Link
                  key={item.id}
                  href={`/groups/${item.groupId}/activity`}
                  className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
                >
                  <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">
                        {item.actorName ?? 'Someone'}
                      </span>{' '}
                      {actionLabel(item.action)}{' '}
                      <span className="font-medium">
                        {item.entity ?? item.groupName}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
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
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Clock3 className="h-9 w-9 text-primary" />
              <h2 className="text-lg font-semibold">
                Your shared expense activity will appear here.
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Activity is shown when groups record created, edited, or deleted
                expenses.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
