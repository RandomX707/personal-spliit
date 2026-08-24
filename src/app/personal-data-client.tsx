'use client'

import { getRecentGroups } from '@/app/groups/recent-groups-helpers'
import {
  identityStorageKey,
  legacyIdentityStorageKey,
  parseStoredIdentity,
} from '@/lib/identity'
import { trpc } from '@/trpc/client'
import { useEffect, useMemo, useState } from 'react'

export function usePersonalDashboardData() {
  const [groups, setGroups] = useState<
    { groupId: string; participantId: string }[] | null
  >(null)
  const [storedName, setStoredName] = useState<string | null>(null)

  useEffect(() => {
    const recentGroups = getRecentGroups()
    setGroups(
      recentGroups.flatMap((group) => {
        const participantId = localStorage.getItem(`${group.id}-activeUser`)
        if (!participantId || participantId === 'None') return []
        return [{ groupId: group.id, participantId }]
      }),
    )
    const identity = parseStoredIdentity(
      localStorage.getItem(identityStorageKey) ??
        localStorage.getItem(legacyIdentityStorageKey),
    )
    setStoredName(identity.displayName || null)
  }, [])

  const query = trpc.personal.dashboard.useQuery(
    { groups: groups ?? [] },
    { enabled: groups !== null },
  )

  return useMemo(
    () => ({
      ...query,
      isLocalStorageReady: groups !== null,
      activeGroups: groups ?? [],
      displayName: storedName ?? query.data?.dashboard.profileName ?? null,
    }),
    [groups, query, storedName],
  )
}
