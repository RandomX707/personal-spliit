'use client'
import { AddGroupByUrlButton } from '@/app/groups/add-group-by-url-button'
import {
  RecentGroups,
  getArchivedGroups,
  getRecentGroups,
  getStarredGroups,
} from '@/app/groups/recent-groups-helpers'
import { EmptyState, PageHeader, SectionHeader } from '@/components/ledger-ui'
import { Button } from '@/components/ui/button'
import { getGroups } from '@/lib/api'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { Loader2, Plus, WalletCards } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { PropsWithChildren, useEffect, useState } from 'react'
import { GlobalBalanceCard } from './global-balance-card'
import { RecentGroupListCard } from './recent-group-list-card'

export type RecentGroupsState =
  | { status: 'pending' }
  | {
      status: 'partial'
      groups: RecentGroups
      starredGroups: string[]
      archivedGroups: string[]
    }
  | {
      status: 'complete'
      groups: RecentGroups
      groupsDetails: Awaited<ReturnType<typeof getGroups>>
      starredGroups: string[]
      archivedGroups: string[]
    }

function sortGroups({
  groups,
  starredGroups,
  archivedGroups,
}: {
  groups: RecentGroups
  starredGroups: string[]
  archivedGroups: string[]
}) {
  const starredGroupInfo = []
  const groupInfo = []
  const archivedGroupInfo = []
  for (const group of groups) {
    if (starredGroups.includes(group.id)) {
      starredGroupInfo.push(group)
    } else if (archivedGroups.includes(group.id)) {
      archivedGroupInfo.push(group)
    } else {
      groupInfo.push(group)
    }
  }
  return {
    starredGroupInfo,
    groupInfo,
    archivedGroupInfo,
  }
}

export function RecentGroupList() {
  const [state, setState] = useState<RecentGroupsState>({ status: 'pending' })

  function loadGroups() {
    const groupsInStorage = getRecentGroups()
    const starredGroups = getStarredGroups()
    const archivedGroups = getArchivedGroups()
    setState({
      status: 'partial',
      groups: groupsInStorage,
      starredGroups,
      archivedGroups,
    })
  }

  useEffect(() => {
    loadGroups()
  }, [])

  if (state.status === 'pending') return null

  return (
    <RecentGroupList_
      groups={state.groups}
      starredGroups={state.starredGroups}
      archivedGroups={state.archivedGroups}
      refreshGroupsFromStorage={() => loadGroups()}
    />
  )
}

function RecentGroupList_({
  groups,
  starredGroups,
  archivedGroups,
  refreshGroupsFromStorage,
}: {
  groups: RecentGroups
  starredGroups: string[]
  archivedGroups: string[]
  refreshGroupsFromStorage: () => void
}) {
  const t = useTranslations('Groups')
  const { data, isLoading } = trpc.groups.list.useQuery({
    groupIds: groups.map((group) => group.id),
  })

  if (isLoading || !data) {
    return (
      <GroupsPage reload={refreshGroupsFromStorage}>
        <div className="ledger-surface rounded-[1.5rem] p-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          {t('loadingRecent')}
        </div>
      </GroupsPage>
    )
  }

  if (data.groups.length === 0) {
    return (
      <GroupsPage reload={refreshGroupsFromStorage}>
        <EmptyState
          icon={WalletCards}
          title="Create a group for anything shared."
          description="Trips, rent, weekend dinners, subscriptions, and everything in between."
          action={
            <Button asChild className="rounded-2xl">
              <Link href="/groups/create">Create group</Link>
            </Button>
          }
        />
      </GroupsPage>
    )
  }

  const { starredGroupInfo, groupInfo, archivedGroupInfo } = sortGroups({
    groups,
    starredGroups,
    archivedGroups,
  })
  const visibleGroupDetails = data.groups.filter((group) => !group.directGroup)
  const visibleGroupIds = new Set(visibleGroupDetails.map((group) => group.id))
  const visibleStarredGroupInfo = starredGroupInfo.filter((group) =>
    visibleGroupIds.has(group.id),
  )
  const visibleGroupInfo = groupInfo.filter((group) =>
    visibleGroupIds.has(group.id),
  )
  const visibleArchivedGroupInfo = archivedGroupInfo.filter((group) =>
    visibleGroupIds.has(group.id),
  )

  return (
    <GroupsPage reload={refreshGroupsFromStorage}>
      <GlobalBalanceCard groups={groups} />

      {visibleStarredGroupInfo.length > 0 && (
        <section>
          <SectionHeader title="Pinned" />
          <GroupList
            groups={visibleStarredGroupInfo}
            groupDetails={visibleGroupDetails}
            archivedGroups={archivedGroups}
            starredGroups={starredGroups}
            refreshGroupsFromStorage={refreshGroupsFromStorage}
          />
        </section>
      )}

      {visibleGroupInfo.length > 0 && (
        <section>
          <SectionHeader title="Recent" />
          <GroupList
            groups={visibleGroupInfo}
            groupDetails={visibleGroupDetails}
            archivedGroups={archivedGroups}
            starredGroups={starredGroups}
            refreshGroupsFromStorage={refreshGroupsFromStorage}
          />
        </section>
      )}

      {visibleArchivedGroupInfo.length > 0 && (
        <section className="opacity-70">
          <SectionHeader title="Archived" />
          <div className="opacity-50">
            <GroupList
              groups={visibleArchivedGroupInfo}
              groupDetails={visibleGroupDetails}
              archivedGroups={archivedGroups}
              starredGroups={starredGroups}
              refreshGroupsFromStorage={refreshGroupsFromStorage}
            />
          </div>
        </section>
      )}
    </GroupsPage>
  )
}

function GroupList({
  groups,
  groupDetails,
  starredGroups,
  archivedGroups,
  refreshGroupsFromStorage,
}: {
  groups: RecentGroups
  groupDetails?: AppRouterOutput['groups']['list']['groups']
  starredGroups: string[]
  archivedGroups: string[]
  refreshGroupsFromStorage: () => void
}) {
  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {groups.map((group) => (
        <RecentGroupListCard
          key={group.id}
          group={group}
          groupDetail={groupDetails?.find(
            (groupDetail) => groupDetail.id === group.id,
          )}
          isStarred={starredGroups.includes(group.id)}
          isArchived={archivedGroups.includes(group.id)}
          refreshGroupsFromStorage={refreshGroupsFromStorage}
        />
      ))}
    </ul>
  )
}

function GroupsPage({
  children,
  reload,
}: PropsWithChildren<{ reload: () => void }>) {
  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        eyebrow="Shared spaces"
        title="Groups"
        description="Create a ledger for a trip, home, party, or anything you split together."
        action={
          <div className="flex gap-2">
            <AddGroupByUrlButton reload={reload} />
            <Button asChild className="rounded-2xl font-bold">
              <Link href="/groups/create">
                <Plus className="mr-2 h-4 w-4" />
                Create group
              </Link>
            </Button>
          </div>
        }
      />
      {children}
    </div>
  )
}
