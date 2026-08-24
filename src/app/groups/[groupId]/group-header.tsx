'use client'

import { GroupTabs } from '@/app/groups/[groupId]/group-tabs'
import { ShareButton } from '@/app/groups/[groupId]/share-button'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Scale, Settings, Users } from 'lucide-react'
import Link from 'next/link'
import { useCurrentGroup } from './current-group-context'

export const GroupHeader = () => {
  const { isLoading, groupId, group } = useCurrentGroup()

  return (
    <div className="ledger-surface flex flex-col justify-between gap-5 rounded-[2rem] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-xl font-black text-background">
            {isLoading ? '₹' : group.name.trim()[0]?.toUpperCase() || 'G'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
              Group ledger
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.03em]">
              <Link href={`/groups/${groupId}`}>
                {isLoading ? (
                  <Skeleton className="mt-1.5 mb-1.5 h-6 w-36" />
                ) : (
                  group.name
                )}
              </Link>
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {group
                ? `${group.participants.length} people · ${group.currencyCode ?? group.currency}`
                : 'Loading group'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-2xl font-bold">
            <Link href={`/groups/${groupId}/expenses/create`}>
              <Plus className="mr-2 h-4 w-4" />
              Add expense
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href={`/groups/${groupId}/balances`}>
              <Scale className="mr-2 h-4 w-4" />
              Settle up
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon"
            title="Group settings"
            className="rounded-full"
          >
            <Link href={`/groups/${groupId}/edit`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          {group && <ShareButton group={group} />}
        </div>
      </div>

      <div className="flex justify-between gap-2">
        <GroupTabs groupId={groupId} />
      </div>
    </div>
  )
}
