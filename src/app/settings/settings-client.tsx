'use client'

import {
  InitialAvatar,
  PageHeader,
  SectionHeader,
} from '@/components/ledger-ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { appConfig } from '@/config/app'
import { TrackPage } from '@/lib/analytics/track-page'
import {
  LedgerIdentity,
  getFallbackIdentity,
  getInitials,
  identityStorageKey,
  legacyIdentityStorageKey,
  parseStoredIdentity,
} from '@/lib/identity'
import { createUpiPaymentUri } from '@/lib/upi'
import { isPlausibleUpiId } from '@/lib/upi-validation'
import {
  Brain,
  ExternalLink,
  FileImage,
  GitBranch,
  Link2,
  Save,
  Smartphone,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'

function SettingSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card className="ledger-surface rounded-[1.5rem]">
      <CardContent className="p-5">
        <SectionHeader title={title} />
        {description && (
          <p className="mb-5 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
        {children}
      </CardContent>
    </Card>
  )
}

export function SettingsClient() {
  const [identity, setIdentity] = useState<LedgerIdentity>(
    getFallbackIdentity(),
  )
  const [loaded, setLoaded] = useState(false)
  const { setTheme } = useTheme()
  const { toast } = useToast()

  useEffect(() => {
    const stored = parseStoredIdentity(
      localStorage.getItem(identityStorageKey) ??
        localStorage.getItem(legacyIdentityStorageKey),
    )
    setIdentity(stored)
    setLoaded(true)
  }, [])

  function update<K extends keyof LedgerIdentity>(
    key: K,
    value: LedgerIdentity[K],
  ) {
    setIdentity((current) => ({ ...current, [key]: value }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (identity.upiId && !isPlausibleUpiId(identity.upiId)) {
      toast({
        title: 'Check the UPI ID',
        description: 'Use a plausible VPA format such as name@bank.',
        variant: 'destructive',
      })
      return
    }
    const nextIdentity = {
      ...identity,
      avatarInitials:
        identity.avatarInitials || getInitials(identity.displayName || 'Me'),
    }
    localStorage.setItem(identityStorageKey, JSON.stringify(nextIdentity))
    localStorage.removeItem(legacyIdentityStorageKey)
    setTheme(nextIdentity.theme)
    setIdentity(nextIdentity)
    toast({ title: 'Settings saved' })
  }

  const sampleUpiUri =
    identity.upiId && identity.displayName
      ? createUpiPaymentUri({
          upiId: identity.upiId,
          payeeName: identity.displayName,
          amountMinor: 85000,
          currencyCode: identity.preferredCurrency,
        })
      : null
  const featureRows = [
    { Icon: Smartphone, label: 'UPI settlements', status: 'Enabled' },
    { Icon: FileImage, label: 'Receipt uploads', status: 'Optional' },
    { Icon: Brain, label: 'AI receipt scanning', status: 'Optional' },
    { Icon: Brain, label: 'AI category suggestions', status: 'Optional' },
  ]

  return (
    <main className="flex flex-col gap-7">
      <TrackPage path="/settings" />
      <PageHeader
        eyebrow="Personal"
        title="Settings"
        description="Control how LEDGER identifies you on this device, how payments are displayed, and which optional features are available."
      />

      <form
        id="identity"
        onSubmit={submit}
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]"
      >
        <div className="grid gap-6">
          <SettingSection
            title="Profile"
            description="This browser-local profile personalizes LEDGER. It does not replace group participants or create an account."
          >
            <div className="grid gap-4 sm:grid-cols-[auto_1fr_160px] sm:items-end">
              <InitialAvatar
                name={identity.displayName || 'Me'}
                avatar={identity.avatarInitials}
                size="lg"
              />
              <div className="grid gap-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={identity.displayName}
                  placeholder="Your name"
                  disabled={!loaded}
                  className="rounded-2xl"
                  onChange={(event) =>
                    update('displayName', event.target.value)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="avatarInitials">Initials</Label>
                <Input
                  id="avatarInitials"
                  value={identity.avatarInitials}
                  placeholder="Auto"
                  maxLength={4}
                  disabled={!loaded}
                  className="rounded-2xl"
                  onChange={(event) =>
                    update('avatarInitials', event.target.value.toUpperCase())
                  }
                />
              </div>
            </div>
          </SettingSection>

          <SettingSection
            title="Identity"
            description="Link profiles that represent the same person across different groups from a friend's detail page. Names are never used as financial identity keys."
          >
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/friends">
                <Link2 className="mr-2 h-4 w-4" />
                Manage linked people
              </Link>
            </Button>
          </SettingSection>

          <SettingSection title="Payments">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="grid gap-2">
                <Label htmlFor="upiId">Your UPI ID</Label>
                <Input
                  id="upiId"
                  inputMode="email"
                  value={identity.upiId ?? ''}
                  placeholder="name@bank"
                  disabled={!loaded}
                  className="rounded-2xl"
                  onChange={(event) => update('upiId', event.target.value)}
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  LEDGER checks only the format. It cannot verify that a UPI ID
                  exists.
                </p>
              </div>
              {sampleUpiUri && (
                <Button asChild variant="outline" className="rounded-2xl">
                  <a href={sampleUpiUri}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Test UPI
                  </a>
                </Button>
              )}
            </div>
          </SettingSection>

          <SettingSection title="Preferences">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="preferredCurrency">Default currency</Label>
                <Select
                  value={identity.preferredCurrency}
                  onValueChange={(value) => update('preferredCurrency', value)}
                >
                  <SelectTrigger id="preferredCurrency" className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR · ₹</SelectItem>
                    <SelectItem value="USD">USD · $</SelectItem>
                    <SelectItem value="EUR">EUR · €</SelectItem>
                    <SelectItem value="GBP">GBP · £</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={identity.theme}
                  onValueChange={(value: LedgerIdentity['theme']) => {
                    update('theme', value)
                    setTheme(value)
                  }}
                >
                  <SelectTrigger id="theme" className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Locale</Label>
                <div className="rounded-2xl border bg-muted px-3 py-2 text-sm font-semibold">
                  {appConfig.defaultLocale}
                </div>
              </div>
            </div>
          </SettingSection>

          <Button
            type="submit"
            className="h-12 w-fit rounded-2xl px-6 font-bold"
          >
            <Save className="mr-2 h-4 w-4" />
            Save settings
          </Button>
        </div>

        <aside className="grid content-start gap-6">
          <SettingSection title="Features">
            <div className="grid gap-3 text-sm">
              {featureRows.map(({ Icon, label, status }) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between gap-3 rounded-2xl border bg-surface-elevated p-3"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    {label}
                  </span>
                  <strong>{status}</strong>
                </div>
              ))}
            </div>
          </SettingSection>

          <SettingSection title="About LEDGER">
            <div className="space-y-4 text-sm leading-6 text-muted-foreground">
              <p>
                LEDGER is a private personal expense-sharing app built on the
                open-source Spliit foundation. The original license and
                attribution are preserved.
              </p>
              <div className="grid gap-2 text-foreground">
                <div className="flex justify-between gap-3">
                  <span>Default currency</span>
                  <strong>
                    {appConfig.defaultCurrency.code} ·{' '}
                    {appConfig.defaultCurrency.symbol}
                  </strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Timezone</span>
                  <strong>{appConfig.timezone}</strong>
                </div>
              </div>
              <Link
                href={appConfig.support.upstreamSource}
                className="inline-flex items-center font-bold text-primary underline"
              >
                <GitBranch className="mr-2 h-4 w-4" />
                Open-source attribution
              </Link>
            </div>
          </SettingSection>
        </aside>
      </form>
    </main>
  )
}
