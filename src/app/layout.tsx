import { ApplePwaSplash } from '@/app/apple-pwa-splash'
import { AppShell } from '@/components/app-shell'
import { ProgressBar } from '@/components/progress-bar'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { appConfig } from '@/config/app'
import { Analytics } from '@/lib/analytics/analytics'
import { getAnalyticsConfig } from '@/lib/analytics/config'
import { effectiveBaseUrl } from '@/lib/env'
import { TRPCProvider } from '@/trpc/client'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import Link from 'next/link'
import { Suspense } from 'react'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(effectiveBaseUrl),
    title: {
      default: `${appConfig.name} · ${appConfig.tagline}`,
      template: `%s · ${appConfig.name}`,
    },
    description: appConfig.description,
    openGraph: {
      title: `${appConfig.name} · ${appConfig.tagline}`,
      description: appConfig.description,
      images: `/banner.png`,
      type: 'website',
      url: '/',
    },
    twitter: {
      card: 'summary_large_image',
      images: `/banner.png`,
      title: `${appConfig.name} · ${appConfig.tagline}`,
      description: appConfig.description,
    },
    appleWebApp: {
      capable: true,
      title: appConfig.name,
    },
    applicationName: appConfig.name,
    icons: [
      {
        url: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}

export const viewport: Viewport = {
  themeColor: '#4f46e5',
}

function Content({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <AppShell>{children}</AppShell>
      <footer className="border-t bg-card/70 px-4 py-6 text-xs text-muted-foreground lg:pl-[17rem] xl:pl-72">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {appConfig.name} is a private fork built from the open-source Spliit
            project.
          </span>
          <span className="flex gap-3 [&_a]:underline">
            <Link href="/settings#about">About</Link>
            <a
              href={appConfig.support.upstreamSource}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open-source attribution
            </a>
          </span>
        </div>
      </footer>
      <Toaster />
    </TRPCProvider>
  )
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()
  const analyticsConfig = await getAnalyticsConfig()
  return (
    <html
      lang={locale}
      dir={['ar', 'he'].includes(locale) ? 'rtl' : 'ltr'}
      suppressHydrationWarning
    >
      <ApplePwaSplash icon="/logo-with-text.png" color="#4f46e5" />
      <body className="min-h-[100dvh] bg-background antialiased">
        <NextIntlClientProvider messages={messages}>
          {/* Rendered inside the provider because it reads translations via
              `useTranslations`, which needs NextIntlClientProvider in its
              ancestor tree. */}
          <ServiceWorkerRegistration />
          <Analytics config={analyticsConfig}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Suspense>
                <ProgressBar />
              </Suspense>
              <Content>{children}</Content>
            </ThemeProvider>
          </Analytics>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
