'use client'

import { GroupTabs } from '@/app/groups/[groupId]/group-tabs'
import { ShareButton } from '@/app/groups/[groupId]/share-button'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Scale, Settings } from 'lucide-react'
import Link from 'next/link'
import { useCurrentGroup } from './current-group-context'

export const GroupHeader = () => {
  const { isLoading, groupId, group } = useCurrentGroup()

  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl">
            {isLoading ? '₹' : group.name.trim()[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              <Link href={`/groups/${groupId}`}>
                {isLoading ? (
                  <Skeleton className="mt-1.5 mb-1.5 h-6 w-36" />
                ) : (
                  group.name
                )}
              </Link>
            </h1>
            <p className="text-sm text-muted-foreground">
              {group
                ? `${group.participants.length} members · ${group.currencyCode ?? group.currency}`
                : 'Loading group'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/groups/${groupId}/expenses/create`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/groups/${groupId}/balances`}>
              <Scale className="mr-2 h-4 w-4" />
              Settle Up
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" title="Group settings">
            <Link href={`/groups/${groupId}/edit`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          {group && <ShareButton group={group} />}
        </div>
      </div>

      <div className="flex gap-2 justify-between">
        <GroupTabs groupId={groupId} />
      </div>
    </div>
  )
}
