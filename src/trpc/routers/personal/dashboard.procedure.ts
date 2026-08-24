import { prisma } from '@/lib/prisma'
import {
  ActiveUserGroup,
  LedgerGroup,
  buildPersonalDashboard,
} from '@/lib/splitmate/personal-ledger'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const dashboardProcedure = baseProcedure
  .input(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.string().min(1),
          participantId: z.string().min(1),
        }),
      ),
    }),
  )
  .query(async ({ input }) => {
    const activeUserGroups: ActiveUserGroup[] = input.groups
    const groupIds = activeUserGroups.map(({ groupId }) => groupId)

    if (groupIds.length === 0) {
      return { dashboard: buildPersonalDashboard([], []) }
    }

    const groups = await prisma.group.findMany({
      where: { id: { in: groupIds } },
      include: {
        participants: { include: { person: true } },
        directGroup: true,
        expenses: {
          include: {
            paidBy: { include: { person: true } },
            paidFor: {
              include: { participant: { include: { person: true } } },
            },
            category: true,
            _count: { select: { documents: true } },
          },
          orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
        },
        activities: {
          orderBy: { time: 'desc' },
          take: 20,
        },
      },
    })

    return {
      dashboard: buildPersonalDashboard(
        groups as LedgerGroup[],
        activeUserGroups,
      ),
    }
  })
