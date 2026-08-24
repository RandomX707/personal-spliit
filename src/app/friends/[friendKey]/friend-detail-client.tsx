'use client'

import { saveRecentGroup } from '@/app/groups/recent-groups-helpers'
import {
  BalanceTone,
  EmptyState,
  InitialAvatar,
  LedgerAmount,
  SectionHeader,
} from '@/components/ledger-ui'
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
import { appConfig } from '@/config/app'
import { TrackPage } from '@/lib/analytics/track-page'
import { CurrencyAmount } from '@/lib/splitmate/personal-ledger'
import { createUpiPaymentUri } from '@/lib/upi'
import { isPlausibleUpiId } from '@/lib/upi-validation'
import { formatDateOnly } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  Plus,
  ReceiptIndianRupee,
  Save,
  ShieldCheck,
  Unlink,
  Users,
  WalletCards,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { usePersonalDashboardData } from '../../personal-data-client'

function mainBalance(balances: CurrencyAmount[]) {
  return balances[0] ?? null
}

function relationshipCopy(name: string, balances: CurrencyAmount[]) {
  const balance = mainBalance(balances)
  if (!balance) return "You're all settled"
  if (balances.length > 1) return 'Balances by currency'
  return balance.amount > 0 ? `${name} owes you` : `You owe ${name}`
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
          note: `${appConfig.name} settlement with ${friend.name}`,
        })
      : null

  const linkParticipant = trpc.personal.linkParticipant.useMutation({
    onSuccess: async () => {
      setLinkCandidate('')
      await utils.personal.dashboard.invalidate()
      toast({ title: 'Profiles linked' })
    },
  })
  const unlinkParticipant = trpc.personal.unlinkParticipant.useMutation({
    onSuccess: async () => {
      await utils.personal.dashboard.invalidate()
      toast({ title: 'Profile unlinked' })
    },
  })
  const updatePerson = trpc.personal.updatePerson.useMutation({
    onSuccess: async () => {
      await utils.personal.dashboard.invalidate()
      toast({ title: 'UPI ID updated' })
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
      toast({ title: 'Settlement recorded' })
    } finally {
      setSettling(false)
    }
  }

  async function copyUpiId() {
    if (!friend?.upiId) return
    await navigator.clipboard.writeText(friend.upiId)
    toast({ title: 'UPI ID copied' })
  }

  return (
    <main className="flex flex-col gap-6">
      <TrackPage path={`/friends/${friendKey}`} />
      <Button asChild variant="ghost" className="w-fit rounded-2xl px-0">
        <Link href="/friends">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Friends
        </Link>
      </Button>

      {loading ? (
        <Skeleton className="h-80 rounded-[2rem]" />
      ) : friend ? (
        <>
          <section className="ledger-surface rounded-[2rem] p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-center gap-4">
                <InitialAvatar
                  name={friend.name}
                  avatar={friend.avatar}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                    Counterparty
                  </p>
                  <h1 className="truncate text-4xl font-black tracking-[-0.03em]">
                    {friend.name}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {friend.sharedGroups.length} shared group
                    {friend.sharedGroups.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="rounded-2xl font-bold">
                  <Link
                    href={`/friends/${encodeURIComponent(friend.key)}/expenses/create`}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add expense
                  </Link>
                </Button>
                {upiUri && (
                  <Button asChild variant="outline" className="rounded-2xl">
                    <a href={upiUri} onClick={() => setPaymentStarted(true)}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Pay via UPI
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-3">
              {friend.balances.length === 0 ? (
                <div className="rounded-3xl border bg-surface-elevated p-5">
                  <CheckCircle2 className="mb-3 h-5 w-5 text-positive" />
                  <div className="text-2xl font-black">Settled</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You do not owe each other right now.
                  </p>
                </div>
              ) : (
                friend.balances.map((balance) => (
                  <div
                    key={balance.currencyCode ?? balance.currency}
                    className="rounded-3xl border bg-surface-elevated p-5"
                  >
                    <div className="text-sm text-muted-foreground">
                      {relationshipCopy(friend.name, [balance])}
                    </div>
                    <BalanceTone
                      amount={balance.amount}
                      className="mt-2 block text-3xl font-black"
                    >
                      <LedgerAmount
                        amount={balance.amount}
                        currency={balance}
                        locale={locale}
                        signed
                      />
                    </BalanceTone>
                  </div>
                ))
              )}
            </div>
          </section>

          {upiUri && inrDebt && (
            <section className="ledger-surface rounded-[2rem] p-5 sm:p-6">
              <SectionHeader title="UPI settlement" />
              <div className="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
                <div className="rounded-[1.5rem] bg-white p-5 text-center shadow-sm">
                  <QRCodeSVG
                    value={upiUri}
                    size={210}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#111111"
                    title={`Pay ${friend.name} via UPI`}
                    className="mx-auto max-w-full"
                  />
                  <p className="mt-3 text-xs font-bold text-neutral-700">
                    Scan with any UPI app
                  </p>
                </div>
                <div className="flex flex-col justify-center gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Pay {friend.name}
                    </div>
                    <div className="mt-1 text-4xl font-black">
                      <LedgerAmount
                        amount={Math.abs(inrDebt.amount)}
                        currency={inrDebt}
                        locale={locale}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{friend.upiId}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full"
                        onClick={copyUpiId}
                      >
                        <Copy className="mr-2 h-3 w-3" />
                        Copy UPI ID
                      </Button>
                    </div>
                  </div>
                  <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                    Opening a UPI app or scanning this QR does not confirm
                    payment. Record the settlement only after payment completes.
                  </p>
                  {paymentStarted ? (
                    <div className="rounded-3xl border bg-surface-elevated p-4">
                      <p className="font-black">Payment opened</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Did you complete the payment?
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          onClick={markUpiSettled}
                          disabled={isSettling}
                          className="rounded-2xl"
                        >
                          Mark as settled
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => setPaymentStarted(false)}
                        >
                          Not yet
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-fit rounded-2xl"
                      onClick={() => setPaymentStarted(true)}
                    >
                      I have paid with UPI
                    </Button>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-6">
              <div>
                <SectionHeader title="Recent transactions" />
                <div className="ledger-surface rounded-[1.5rem] p-2">
                  {expenses.length > 0 ? (
                    expenses.slice(0, 12).map((expense) => (
                      <Link
                        key={expense.id}
                        href={`/groups/${expense.groupId}/expenses/${expense.id}/edit`}
                        className="ledger-list-row grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-primary">
                          <ReceiptIndianRupee className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-black">
                            {expense.title}
                          </div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {expense.groupName} ·{' '}
                            {formatDateOnly(expense.expenseDate, locale, {
                              dateStyle: 'medium',
                            })}
                          </div>
                        </div>
                        <div className="text-right text-sm font-black">
                          <LedgerAmount
                            amount={expense.amount}
                            currency={expense}
                            locale={locale}
                          />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <EmptyState
                      icon={ReceiptIndianRupee}
                      title="No shared expenses yet."
                      description="Add an expense with this friend and it will appear here."
                    />
                  )}
                </div>
              </div>
            </div>

            <aside className="grid content-start gap-6">
              <Card className="ledger-surface rounded-[1.5rem]">
                <CardHeader>
                  <CardTitle>Shared groups</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {friend.sharedGroups.map((group) => (
                    <Button
                      key={group.id}
                      asChild
                      variant="outline"
                      className="justify-between rounded-2xl"
                    >
                      <Link href={`/groups/${group.id}`}>
                        <span>{group.name}</span>
                        <WalletCards className="h-4 w-4" />
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card className="ledger-surface rounded-[1.5rem]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Identity management
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Link profiles that represent the same person across
                    different groups. Names are never used as financial identity
                    keys.
                  </p>
                  <div className="grid gap-2">
                    {friend.participants.map((participant) => (
                      <div
                        key={participant.participantId}
                        className="flex items-center justify-between gap-3 rounded-2xl border bg-surface-elevated p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-bold">
                            {participant.participantName}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {participant.groupName}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
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
                      <Label>Link another profile</Label>
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <Select
                          value={linkCandidate}
                          onValueChange={setLinkCandidate}
                        >
                          <SelectTrigger className="rounded-2xl">
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
                          className="rounded-2xl"
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

              <Card className="ledger-surface rounded-[1.5rem]">
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
                        className="rounded-2xl"
                        onChange={(event) => setUpiId(event.target.value)}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-fit rounded-2xl"
                      disabled={!friend.personId}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    <p className="text-xs leading-5 text-muted-foreground">
                      LEDGER only checks the format locally. It cannot verify
                      that a UPI ID exists.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </aside>
          </section>
        </>
      ) : (
        <EmptyState
          icon={Users}
          title="Friend not found."
          description="This person may no longer be in your recent groups."
          action={
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/friends">Back to friends</Link>
            </Button>
          }
        />
      )}
    </main>
  )
}
