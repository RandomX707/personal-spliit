'use client'

import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { RecurrenceRule, SplitMode } from '@/generated/prisma/browser'
import { getCurrency } from '@/lib/currency'
import { amountAsMinorUnits } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { usePersonalDashboardData } from '../../../../personal-data-client'

type DirectGroupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready'
      groupId: string
      groupName: string
      currentParticipantId: string
      friendParticipantId: string
    }
  | { status: 'error'; message: string }

export function DirectFriendExpenseClient({
  friendKey,
}: {
  friendKey: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const { data, isLoading, isLocalStorageReady, activeGroups } =
    usePersonalDashboardData()
  const [directGroup, setDirectGroup] = useState<DirectGroupState>({
    status: 'idle',
  })
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState<'me' | 'friend'>('me')
  const friend = data?.dashboard.friends.find((item) => item.key === friendKey)
  const sourceGroup = friend?.sharedGroups[0]
  const sourceCurrentParticipantId = sourceGroup?.currentParticipantId
  const accessibleGroupIds = useMemo(
    () => activeGroups.map((group) => group.groupId),
    [activeGroups],
  )
  const ensureDirectGroup = trpc.personal.ensureDirectGroup.useMutation()
  const createExpense = trpc.groups.expenses.create.useMutation()
  const utils = trpc.useUtils()

  useEffect(() => {
    if (
      !friend?.personId ||
      !sourceCurrentParticipantId ||
      directGroup.status !== 'idle' ||
      accessibleGroupIds.length === 0
    ) {
      return
    }
    setDirectGroup({ status: 'loading' })
    ensureDirectGroup
      .mutateAsync({
        currentParticipantId: sourceCurrentParticipantId,
        friendPersonId: friend.personId,
        accessibleGroupIds,
      })
      .then((group) => {
        localStorage.setItem(
          `${group.groupId}-activeUser`,
          group.currentParticipantId,
        )
        saveRecentGroup({ id: group.groupId, name: group.groupName })
        setDirectGroup({ status: 'ready', ...group })
      })
      .catch((error: Error) => {
        setDirectGroup({
          status: 'error',
          message: error.message || 'Could not prepare a direct expense.',
        })
      })
  }, [
    accessibleGroupIds,
    directGroup.status,
    ensureDirectGroup,
    friend,
    sourceCurrentParticipantId,
  ])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (directGroup.status !== 'ready' || !friend) return
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: 'Enter a valid amount',
        variant: 'destructive',
      })
      return
    }

    const currency = getCurrency('INR')
    const amountMinor = amountAsMinorUnits(parsedAmount, currency)
    const payer =
      paidBy === 'me'
        ? directGroup.currentParticipantId
        : directGroup.friendParticipantId

    const { expenseId } = await createExpense.mutateAsync({
      groupId: directGroup.groupId,
      participantId: directGroup.currentParticipantId,
      expenseFormValues: {
        title,
        expenseDate: new Date(),
        amount: amountMinor,
        originalCurrency: 'INR',
        originalAmount: undefined,
        conversionRate: undefined,
        category: 0,
        paidBy: payer,
        paidFor: [
          { participant: directGroup.currentParticipantId, shares: 1 },
          { participant: directGroup.friendParticipantId, shares: 1 },
        ],
        splitMode: SplitMode.EVENLY,
        saveDefaultSplittingOptions: false,
        isReimbursement: false,
        documents: [],
        notes: '',
        recurrenceRule: RecurrenceRule.NONE,
      },
    })
    await utils.personal.dashboard.invalidate()
    toast({
      title: 'Expense added',
      description: `${title} was split with ${friend.name}.`,
    })
    router.push(`/groups/${directGroup.groupId}/expenses/${expenseId}/edit`)
  }

  const loading =
    isLoading || !isLocalStorageReady || directGroup.status === 'loading'

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Button asChild variant="ghost" className="w-fit px-0">
        <Link href={`/friends/${encodeURIComponent(friendKey)}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {friend?.name ?? 'Friend'}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Add friend expense</CardTitle>
          <CardDescription>
            Split a direct expense without manually creating a group.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          ) : directGroup.status === 'error' || !friend?.personId ? (
            <p className="text-sm text-destructive">
              {directGroup.status === 'error'
                ? directGroup.message
                : 'This friend needs a stable person identity before direct expenses can be added.'}
            </p>
          ) : directGroup.status === 'ready' ? (
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="direct-title">Description</Label>
                <Input
                  id="direct-title"
                  required
                  minLength={2}
                  placeholder="Dinner"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="direct-amount">Amount</Label>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border bg-muted px-3 py-2 text-sm">
                    ₹
                  </span>
                  <Input
                    id="direct-amount"
                    required
                    inputMode="decimal"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="1200"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="direct-paid-by">Paid by</Label>
                <Select
                  value={paidBy}
                  onValueChange={(value: 'me' | 'friend') => setPaidBy(value)}
                >
                  <SelectTrigger id="direct-paid-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="me">You</SelectItem>
                    <SelectItem value="friend">{friend.name}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                Split equally between you and {friend.name}. Each person pays
                half.
              </div>
              <Button type="submit" disabled={createExpense.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Save expense
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
