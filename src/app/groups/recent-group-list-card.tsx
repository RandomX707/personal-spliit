import {
  RecentGroup,
  archiveGroup,
  deleteRecentGroup,
  starGroup,
  unarchiveGroup,
  unstarGroup,
} from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { StarFilledIcon } from '@radix-ui/react-icons'
import {
  Calendar,
  ChevronRight,
  MoreHorizontal,
  Star,
  Users,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'

export function RecentGroupListCard({
  group,
  groupDetail,
  isStarred,
  isArchived,
  refreshGroupsFromStorage,
}: {
  group: RecentGroup
  groupDetail?: AppRouterOutput['groups']['list']['groups'][number]
  isStarred: boolean
  isArchived: boolean
  refreshGroupsFromStorage: () => void
}) {
  const locale = useLocale()
  const toast = useToast()
  const t = useTranslations('Groups')

  return (
    <li>
      <div className="ledger-surface group rounded-[1.5rem] p-4 transition-colors hover:bg-accent/60">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/groups/${group.id}`}
            className="flex min-w-0 flex-1 gap-3"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-lg font-black text-background">
              {group.name.trim()[0]?.toUpperCase() ?? 'G'}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black tracking-[-0.01em]">
                {group.name}
              </h3>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {groupDetail ? (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {groupDetail._count.participants} people
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(groupDetail.createdAt).toLocaleDateString(
                        locale,
                        { dateStyle: 'medium' },
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-24 rounded-full" />
                  </>
                )}
              </div>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full"
              aria-label={isStarred ? 'Remove favorite' : 'Favorite group'}
              onClick={() => {
                if (isStarred) {
                  unstarGroup(group.id)
                } else {
                  starGroup(group.id)
                  unarchiveGroup(group.id)
                }
                refreshGroupsFromStorage()
              }}
            >
              {isStarred ? (
                <StarFilledIcon className="h-4 w-4 text-warning" />
              ) : (
                <Star className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                  aria-label="Group actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    deleteRecentGroup(group)
                    refreshGroupsFromStorage()
                    toast.toast({
                      title: t('RecentRemovedToast.title'),
                      description: t('RecentRemovedToast.description'),
                    })
                  }}
                >
                  {t('removeRecent')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (isArchived) {
                      unarchiveGroup(group.id)
                    } else {
                      archiveGroup(group.id)
                      unstarGroup(group.id)
                    }
                    refreshGroupsFromStorage()
                  }}
                >
                  {t(isArchived ? 'unarchive' : 'archive')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </div>
        </div>
      </div>
    </li>
  )
}
