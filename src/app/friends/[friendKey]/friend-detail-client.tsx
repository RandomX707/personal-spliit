'use client'

import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { TrackPage } from '@/lib/analytics/track-page'
import { CurrencyAmount } from '@/lib/splitmate/personal-ledger'
import { createUpiPaymentUri } from '@/lib/upi'
import { isPlausibleUpiId } from '@/lib/upi-validation'
import {
  cn,
  formatCurrency,
  formatDateOnly,
  getCurrencyFromGroup,
} from '@/lib/utils'
import { trpc } from '@/trpc/client'
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Link2,
  Plus,
  ReceiptIndianRupee,
  Save,
  Unlink,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { usePersonalDashboardData } from '../../personal-data-client'

function summarizeFriendBalance(name: string, balances: CurrencyAmount[]) {
  if (balances.length === 0) return 'You are settled up'
  if (balances.length === 1) {
    return balances[0].amount > 0 ? `${name} owes you` : `You owe ${name}`
  }
  return 'Balances by currency'
}

function BalanceAmount({ balance }: { balance: CurrencyAmount }) {
  const locale = useLocale()
  return (
    <span
      className={cn(
        'font-semibold tabular-nums',
        balance.amount > 0
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-600 dark:text-red-400',
      )}
    >
      {formatCurrency(
        getCurrencyFromGroup(balance),
        Math.abs(balance.amount),
        locale,
      )}
    </span>
  )
}

export function FriendDetailClient({ friendKey }: { friendKey: string }) {
  const locale = useLocale()
  const utils = trpc.useUtils()
  const { toast } = useToast()
  const { data, isLoading, isLocalStorageReady, activeGroups } =
    usePersonalDashboardData()
  const [linkCandidate, setLinkCandidate] = useState('')
  const [upiId, setUpiId] = useState('')
  const [paymentStarted, setPaymentStarted] = useState(false)
  const [isSettling, setSettling] = useState(false)
  const loading = isLoading || !isLocalStorageReady
  const friend = data?.dashboard.friends.find((item) => item.key === friendKey)
  const accessibleGroupIds = activeGroups.map((group) => group.groupId)

  const expenses = useMemo(
    () =>
      data?.dashboard.expenses.filter((expense) =>
        friend?.sharedGroups.some((group) => group.id === expense.groupId),
      ) ?? [],
    [data, friend],
  )
  const linkCandidates = useMemo(
    () =>
      data?.dashboard.participantIdentities.filter(
        (identity) =>
          !identity.isCurrentUser &&
          identity.personId !== friend?.personId &&
          !friend?.participants.some(
            (participant) =>
              participant.participantId === identity.participantId,
          ),
      ) ?? [],
    [data, friend],
  )
  const inrDebt = friend?.balances.find(
    (balance) => balance.amount < 0 && balance.currencyCode === 'INR',
  )
  const canUseUpi =
    !!friend?.personId && !!inrDebt && isPlausibleUpiId(friend.upiId)
  const upiUri =
    canUseUpi && inrDebt
      ? createUpiPaymentUri({
          upiId: friend.upiId!,
          payeeName: friend.name,
          amountMinor: Math.abs(inrDebt.amount),
          currencyCode: 'INR',
          note: `SplitMate settlement with ${friend.name}`,
        })
      : null

  const linkParticipant = trpc.personal.linkParticipant.useMutation({
    onSuccess: async () => {
      setLinkCandidate('')
      await utils.personal.dashboard.invalidate()
      toast({ title: 'Participant linked' })
    },
  })
  const unlinkParticipant = trpc.personal.unlinkParticipant.useMutation({
    onSuccess: async () => {
      await utils.personal.dashboard.invalidate()
      toast({ title: 'Participant unlinked' })
    },
  })
  const updatePerson = trpc.personal.updatePerson.useMutation({
    onSuccess: async () => {
      await utils.personal.dashboard.invalidate()
      toast({ title: 'Friend details saved' })
    },
  })
  const ensureDirectGroup = trpc.personal.ensureDirectGroup.useMutation()
  const createSettlement = trpc.personal.createSettlement.useMutation()

  useEffect(() => {
    setUpiId(friend?.upiId ?? '')
  }, [friend?.key, friend?.upiId])

  async function saveFriendDetails(event: FormEvent) {
    event.preventDefault()
    if (!friend?.personId) return
    await updatePerson.mutateAsync({
      personId: friend.personId,
      accessibleGroupIds,
      upiId,
    })
  }

  async function markUpiSettled() {
    if (!friend?.personId || !inrDebt) return
    const source = friend.sharedGroups[0]
    if (!source) return

    setSettling(true)
    try {
      const direct = await ensureDirectGroup.mutateAsync({
        currentParticipantId: source.currentParticipantId,
        friendPersonId: friend.personId,
        accessibleGroupIds,
      })
      localStorage.setItem(
        `${direct.groupId}-activeUser`,
        direct.currentParticipantId,
      )
      saveRecentGroup({ id: direct.groupId, name: direct.groupName })
      await createSettlement.mutateAsync({
        groupId: direct.groupId,
        fromParticipantId: direct.currentParticipantId,
        toParticipantId: direct.friendParticipantId,
        amount: Math.abs(inrDebt.amount),
        date: new Date(),
        paymentMethod: 'UPI',
        note: `UPI settlement with ${friend.name}`,
        accessibleGroupIds: [...accessibleGroupIds, direct.groupId],
      })
      setPaymentStarted(false)
      await utils.personal.dashboard.invalidate()
      toast({
        title: 'Settlement recorded',
        description:
          'The UPI payment was marked as settled by your confirmation.',
      })
    } finally {
      setSettling(false)
    }
  }

  return (
    <main className="flex flex-col gap-6">
      <TrackPage path={`/friends/${friendKey}`} />
      <Button asChild variant="ghost" className="w-fit px-0">
        <Link href="/friends">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Friends
        </Link>
      </Button>

      {loading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : friend ? (
        <>
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                  {(friend.avatar || friend.name.slice(0, 2)).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-normal">
                    {friend.name}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {summarizeFriendBalance(friend.name, friend.balances)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link
                    href={`/friends/${encodeURIComponent(friend.key)}/expenses/create`}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </Link>
                </Button>
                {upiUri && (
                  <Button asChild variant="outline">
                    <a href={upiUri} onClick={() => setPaymentStarted(true)}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Pay via UPI
                    </a>
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {friend.balances.length === 0 ? (
                <div className="rounded-xl border bg-background p-4">
                  <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-500" />
                  <div className="text-lg font-semibold">Settled up</div>
                  <p className="text-sm text-muted-foreground">
                    No open balance.
                  </p>
                </div>
              ) : (
                friend.balances.map((balance) => (
                  <div
                    key={balance.currencyCode ?? balance.currency}
                    className="rounded-xl border bg-background p-4"
                  >
                    <div className="text-sm text-muted-foreground">
                      {balance.amount > 0
                        ? `${friend.name} owes you`
                        : `You owe ${friend.name}`}
                    </div>
                    <div className="mt-1 text-2xl">
                      <BalanceAmount balance={balance} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {upiUri && inrDebt && (
            <Card>
              <CardHeader>
                <CardTitle>UPI settlement</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[auto_1fr]">
                <div className="rounded-lg bg-white p-3">
                  <QRCodeSVG
                    value={upiUri}
                    size={180}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                    title={`Pay ${friend.name} via UPI`}
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Pay{' '}
                    <strong className="text-foreground">
                      {formatCurrency(
                        getCurrencyFromGroup(inrDebt),
                        Math.abs(inrDebt.amount),
                        locale,
                      )}
                    </strong>{' '}
                    to {friend.name}. Opening a UPI app or scanning this QR does
                    not confirm payment.
                  </p>
                  {paymentStarted && (
                    <div className="rounded-lg border bg-background p-3">
                      <p className="text-sm font-medium">
                        Did you complete the payment?
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button onClick={markUpiSettled} disabled={isSettling}>
                          Mark as settled
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setPaymentStarted(false)}
                        >
                          Not yet
                        </Button>
                      </div>
                    </div>
                  )}
                  {!paymentStarted && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setPaymentStarted(true)}
                    >
                      I have paid with UPI
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Shared groups</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {friend.sharedGroups.map((group) => (
                    <Button
                      key={group.id}
                      asChild
                      variant="outline"
                      className="justify-start"
                    >
                      <Link href={`/groups/${group.id}`}>{group.name}</Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Identity linking</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    {friend.participants.map((participant) => (
                      <div
                        key={participant.participantId}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                      >
                        <div>
                          <div className="font-medium">
                            {participant.participantName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {participant.groupName}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            unlinkParticipant.mutate({
                              participantId: participant.participantId,
                              accessibleGroupIds,
                            })
                          }
                        >
                          <Unlink className="mr-2 h-3 w-3" />
                          Unlink
                        </Button>
                      </div>
                    ))}
                  </div>
                  {friend.personId && linkCandidates.length > 0 && (
                    <div className="grid gap-2">
                      <Label>Link another participant as this person</Label>
                      <div className="flex gap-2">
                        <Select
                          value={linkCandidate}
                          onValueChange={setLinkCandidate}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose participant" />
                          </SelectTrigger>
                          <SelectContent>
                            {linkCandidates.map((candidate) => (
                              <SelectItem
                                key={candidate.participantId}
                                value={candidate.participantId}
                              >
                                {candidate.participantName} ·{' '}
                                {candidate.groupName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          disabled={!linkCandidate}
                          onClick={() =>
                            linkParticipant.mutate({
                              participantId: linkCandidate,
                              targetPersonId: friend.personId!,
                              accessibleGroupIds,
                            })
                          }
                        >
                          <Link2 className="mr-2 h-4 w-4" />
                          Link
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment details</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={saveFriendDetails} className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="friend-upi">UPI ID</Label>
                      <Input
                        id="friend-upi"
                        placeholder="name@bank"
                        value={upiId}
                        onChange={(event) => setUpiId(event.target.value)}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-fit"
                      disabled={!friend.personId}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      SplitMate only checks the format locally. It cannot verify
                      that a UPI ID exists.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent transactions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {expenses.length > 0 ? (
                  expenses.slice(0, 12).map((expense) => (
                    <Link
                      key={expense.id}
                      href={`/groups/${expense.groupId}/expenses/${expense.id}/edit`}
                      className="flex items-center justify-between gap-3 rounded-lg p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        <ReceiptIndianRupee className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{expense.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {expense.groupName} ·{' '}
                            {formatDateOnly(expense.expenseDate, locale, {
                              dateStyle: 'medium',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm font-semibold tabular-nums">
                        {formatCurrency(
                          getCurrencyFromGroup(expense),
                          expense.amount,
                          locale,
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No transactions found.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <h1 className="text-xl font-semibold">Friend not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This friend may no longer be in your recent groups.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
