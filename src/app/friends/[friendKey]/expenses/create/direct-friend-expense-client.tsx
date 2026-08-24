'use client'

import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import { InitialAvatar } from '@/components/ledger-ui'
import { Button } from '@/components/ui/button'
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
import { amountAsMinorUnits, formatCurrency } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { ArrowLeft, Check, ReceiptIndianRupee } from 'lucide-react'
import { useLocale } from 'next-intl'
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
  const locale = useLocale()
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
      toast({ title: 'Enter a valid amount', variant: 'destructive' })
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
    toast({ title: 'Expense added' })
    router.push(`/groups/${directGroup.groupId}/expenses/${expenseId}/edit`)
  }

  const loading =
    isLoading || !isLocalStorageReady || directGroup.status === 'loading'
  const parsedAmount = Number(amount)
  const eachShare =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount / 2 : 0

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Button asChild variant="ghost" className="w-fit rounded-2xl px-0">
        <Link href={`/friends/${encodeURIComponent(friendKey)}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {friend?.name ?? 'Friend'}
        </Link>
      </Button>

      <section className="ledger-surface overflow-hidden rounded-[2rem] p-5 sm:p-7">
        <div className="mb-7 flex items-center gap-4">
          {friend ? (
            <InitialAvatar name={friend.name} avatar={friend.avatar} />
          ) : (
            <Skeleton className="h-11 w-11 rounded-full" />
          )}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
              New expense
            </p>
            <h1 className="text-3xl font-black tracking-[-0.03em]">
              {friend ? `With ${friend.name}` : 'Friend expense'}
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4">
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
          </div>
        ) : directGroup.status === 'error' || !friend?.personId ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {directGroup.status === 'error'
              ? directGroup.message
              : 'This friend needs a stable identity before direct expenses can be added.'}
          </p>
        ) : directGroup.status === 'ready' ? (
          <form onSubmit={submit} className="grid gap-5">
            <div className="rounded-[1.5rem] border bg-surface-elevated p-5">
              <Label
                htmlFor="direct-amount"
                className="text-xs uppercase tracking-[0.18em]"
              >
                Amount
              </Label>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-4xl font-black text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="direct-amount"
                  required
                  inputMode="decimal"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0"
                  value={amount}
                  className="h-16 border-0 bg-transparent px-0 text-5xl font-black tracking-[-0.04em] shadow-none focus-visible:ring-0"
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Equal split:{' '}
                {eachShare > 0
                  ? formatCurrency(getCurrency('INR'), eachShare * 100, locale)
                  : '₹0.00'}{' '}
                each
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="direct-title">Description</Label>
                <Input
                  id="direct-title"
                  required
                  minLength={2}
                  placeholder="Dinner"
                  value={title}
                  className="rounded-2xl"
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="direct-paid-by">Paid by</Label>
                <Select
                  value={paidBy}
                  onValueChange={(value: 'me' | 'friend') => setPaidBy(value)}
                >
                  <SelectTrigger id="direct-paid-by" className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="me">You</SelectItem>
                    <SelectItem value="friend">{friend.name}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border bg-surface-elevated p-4 text-sm text-muted-foreground">
              <ReceiptIndianRupee className="h-4 w-4 text-primary" />
              <span>
                Split equally between you and {friend.name}. LEDGER keeps the
                hidden direct group out of your way.
              </span>
            </div>

            <Button
              type="submit"
              disabled={createExpense.isPending}
              className="h-12 rounded-2xl text-base font-bold"
            >
              <Check className="mr-2 h-4 w-4" />
              Add expense
            </Button>
          </form>
        ) : null}
      </section>
    </main>
  )
}
