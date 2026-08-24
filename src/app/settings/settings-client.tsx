'use client'

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
import { useToast } from '@/components/ui/use-toast'
import { appConfig } from '@/config/app'
import { TrackPage } from '@/lib/analytics/track-page'
import {
  SplitMateIdentity,
  getFallbackIdentity,
  getInitials,
  identityStorageKey,
  parseStoredIdentity,
} from '@/lib/identity'
import { createUpiPaymentUri } from '@/lib/upi'
import { isPlausibleUpiId } from '@/lib/upi-validation'
import { ExternalLink, Save } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'

export function SettingsClient() {
  const [identity, setIdentity] = useState<SplitMateIdentity>(
    getFallbackIdentity(),
  )
  const [loaded, setLoaded] = useState(false)
  const { setTheme } = useTheme()
  const { toast } = useToast()

  useEffect(() => {
    const stored = parseStoredIdentity(localStorage.getItem(identityStorageKey))
    setIdentity(stored)
    setLoaded(true)
  }, [])

  function update<K extends keyof SplitMateIdentity>(
    key: K,
    value: SplitMateIdentity[K],
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
    setTheme(nextIdentity.theme)
    setIdentity(nextIdentity)
    toast({
      title: 'Identity saved',
      description: 'Your SplitMate profile is stored on this device.',
    })
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

  return (
    <main className="flex flex-col gap-6">
      <TrackPage path="/settings" />
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Personal preferences for this browser and feature availability for
          this deployment.
        </p>
      </div>

      <form
        id="identity"
        onSubmit={submit}
        className="grid gap-6 xl:grid-cols-[1fr_.8fr]"
      >
        <Card>
          <CardHeader>
            <CardTitle>My Identity</CardTitle>
            <CardDescription>
              This app keeps group access lightweight. Your profile is stored
              locally and does not replace group participants.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={identity.displayName}
                placeholder="Your name"
                disabled={!loaded}
                onChange={(event) => update('displayName', event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avatarInitials">Avatar / initials</Label>
              <Input
                id="avatarInitials"
                value={identity.avatarInitials}
                placeholder="Auto from name"
                maxLength={4}
                disabled={!loaded}
                onChange={(event) =>
                  update('avatarInitials', event.target.value.toUpperCase())
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="preferredCurrency">Preferred currency</Label>
              <Select
                value={identity.preferredCurrency}
                onValueChange={(value) => update('preferredCurrency', value)}
              >
                <SelectTrigger id="preferredCurrency">
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
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                inputMode="email"
                value={identity.upiId ?? ''}
                placeholder="name@bank"
                disabled={!loaded}
                onChange={(event) => update('upiId', event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={identity.theme}
                onValueChange={(value: SplitMateIdentity['theme']) => {
                  update('theme', value)
                  setTheme(value)
                }}
              >
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-fit">
              <Save className="mr-2 h-4 w-4" />
              Save settings
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature availability</CardTitle>
              <CardDescription>
                Optional capabilities degrade gracefully when their environment
                variables are absent.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex justify-between gap-3">
                <span>Default currency</span>
                <strong>
                  {appConfig.defaultCurrency.code} ·{' '}
                  {appConfig.defaultCurrency.symbol}
                </strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>Locale</span>
                <strong>{appConfig.defaultLocale}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>Timezone</span>
                <strong>{appConfig.timeZone}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>UPI settlements</span>
                <strong>Enabled</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span>AI receipt scanning</span>
                <strong>Optional</strong>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>UPI preview</CardTitle>
              <CardDescription>
                Opening a UPI link never marks a balance as settled. You still
                record the settlement manually after payment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sampleUpiUri ? (
                <Button asChild variant="outline">
                  <a href={sampleUpiUri}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Test UPI app link
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add a display name and UPI ID to preview payment links.
                </p>
              )}
            </CardContent>
          </Card>

          <Card id="about">
            <CardHeader>
              <CardTitle>About {appConfig.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                {appConfig.name} is a private personal fork of Spliit. The
                original open-source license and attribution are preserved.
              </p>
              <Link
                href={appConfig.support.upstreamSource}
                className="inline-flex items-center font-medium text-primary underline"
              >
                View upstream project
              </Link>
            </CardContent>
          </Card>
        </div>
      </form>
    </main>
  )
}
