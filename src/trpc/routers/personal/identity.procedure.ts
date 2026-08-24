import {
  createDirectExpenseGroup,
  createExpense,
  ensureParticipantPerson,
} from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { randomId } from '@/lib/random'
import { ExpenseFormValues } from '@/lib/schemas'
import { isPlausibleUpiId } from '@/lib/upi-validation'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

const accessibleGroupIdsSchema = z.array(z.string().min(1)).min(1)

async function assertParticipantAccessible(
  participantId: string,
  accessibleGroupIds: string[],
) {
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, groupId: { in: accessibleGroupIds } },
    include: { person: true },
  })
  if (!participant) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Participant is not in an accessible group.',
    })
  }
  return participant
}

async function assertParticipantInGroup(
  participantId: string,
  groupId: string,
) {
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, groupId },
    include: { person: true },
  })
  if (!participant) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Settlement participant is not in the selected group.',
    })
  }
  return participant
}

async function assertPersonAccessible(
  personId: string,
  accessibleGroupIds: string[],
) {
  const person = await prisma.person.findFirst({
    where: {
      id: personId,
      participants: { some: { groupId: { in: accessibleGroupIds } } },
    },
  })
  if (!person) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Person is not linked to an accessible group.',
    })
  }
  return person
}

export const linkParticipantProcedure = baseProcedure
  .input(
    z.object({
      participantId: z.string().min(1),
      targetPersonId: z.string().min(1),
      accessibleGroupIds: accessibleGroupIdsSchema,
    }),
  )
  .mutation(async ({ input }) => {
    await assertParticipantAccessible(
      input.participantId,
      input.accessibleGroupIds,
    )
    await assertPersonAccessible(input.targetPersonId, input.accessibleGroupIds)

    const participant = await prisma.participant.update({
      where: { id: input.participantId },
      data: { personId: input.targetPersonId },
      include: { person: true },
    })
    return { participant }
  })

export const unlinkParticipantProcedure = baseProcedure
  .input(
    z.object({
      participantId: z.string().min(1),
      accessibleGroupIds: accessibleGroupIdsSchema,
    }),
  )
  .mutation(async ({ input }) => {
    const participant = await assertParticipantAccessible(
      input.participantId,
      input.accessibleGroupIds,
    )
    const person = await prisma.person.create({
      data: {
        id: randomId(),
        displayName: participant.name,
        participants: { connect: { id: participant.id } },
      },
    })
    return { person }
  })

export const updatePersonProcedure = baseProcedure
  .input(
    z.object({
      personId: z.string().min(1),
      accessibleGroupIds: accessibleGroupIdsSchema,
      displayName: z.string().min(1).max(80).optional(),
      avatar: z.string().max(8).optional(),
      upiId: z
        .string()
        .max(120)
        .optional()
        .refine((value) => !value || isPlausibleUpiId(value), {
          message: 'Enter a plausible UPI ID, for example name@bank.',
        }),
    }),
  )
  .mutation(async ({ input }) => {
    await assertPersonAccessible(input.personId, input.accessibleGroupIds)
    const person = await prisma.person.update({
      where: { id: input.personId },
      data: {
        displayName: input.displayName,
        avatar: input.avatar,
        upiId: input.upiId?.trim() || null,
      },
    })
    return { person }
  })

export const ensureDirectGroupProcedure = baseProcedure
  .input(
    z.object({
      currentParticipantId: z.string().min(1),
      friendPersonId: z.string().min(1),
      accessibleGroupIds: accessibleGroupIdsSchema,
    }),
  )
  .mutation(async ({ input }) => {
    await assertParticipantAccessible(
      input.currentParticipantId,
      input.accessibleGroupIds,
    )
    await assertPersonAccessible(input.friendPersonId, input.accessibleGroupIds)

    const group = await createDirectExpenseGroup({
      currentParticipantId: input.currentParticipantId,
      friendPersonId: input.friendPersonId,
    })
    const currentPersonId = await ensureParticipantPerson(
      input.currentParticipantId,
    )
    const currentParticipant = group.participants.find(
      (participant) => participant.personId === currentPersonId,
    )
    const friendParticipant = group.participants.find(
      (participant) => participant.personId === input.friendPersonId,
    )
    if (!currentParticipant || !friendParticipant) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Direct group participants could not be resolved.',
      })
    }
    return {
      groupId: group.id,
      groupName: group.name,
      currentParticipantId: currentParticipant.id,
      friendParticipantId: friendParticipant.id,
    }
  })

export const createSettlementProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      fromParticipantId: z.string().min(1),
      toParticipantId: z.string().min(1),
      amount: z.number().int().positive(),
      date: z.coerce.date(),
      note: z.string().max(500).optional(),
      paymentMethod: z.enum(['UPI', 'Cash', 'Bank transfer', 'Other']),
      accessibleGroupIds: accessibleGroupIdsSchema,
    }),
  )
  .mutation(async ({ input }) => {
    if (!input.accessibleGroupIds.includes(input.groupId)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Group is not accessible.',
      })
    }
    const group = await prisma.group.findUnique({
      where: { id: input.groupId },
      select: { currencyCode: true },
    })
    if (!group) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Group was not found.',
      })
    }
    await assertParticipantInGroup(input.fromParticipantId, input.groupId)
    await assertParticipantInGroup(input.toParticipantId, input.groupId)

    const values: ExpenseFormValues = {
      title: `${input.paymentMethod} settlement`,
      expenseDate: input.date,
      amount: input.amount,
      originalCurrency: group.currencyCode ?? undefined,
      originalAmount: undefined,
      conversionRate: undefined,
      category: 1,
      paidBy: input.fromParticipantId,
      paidFor: [{ participant: input.toParticipantId, shares: 1 }],
      splitMode: 'EVENLY',
      saveDefaultSplittingOptions: false,
      isReimbursement: true,
      documents: [],
      notes: input.note,
      recurrenceRule: 'NONE',
    }
    const expense = await createExpense(
      values,
      input.groupId,
      input.fromParticipantId,
    )
    return { expenseId: expense.id }
  })
