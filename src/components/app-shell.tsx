'use client'

import { LedgerLogo } from '@/components/ledger-logo'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { appConfig } from '@/config/app'
import { cn } from '@/lib/utils'
import {
  Activity,
  CircleUserRound,
  Home,
  Plus,
  Settings,
  Users,
  WalletCards,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const primaryNav = [
  { href: '/', label: 'Overview', icon: Home },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/groups', label: 'Groups', icon: WalletCards },
  { href: '/activity', label: 'Activity', icon: Activity },
]

const secondaryNav = [
  { href: '/settings#identity', label: 'My identity', icon: CircleUserRound },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href.split('#')[0])
}

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: typeof Home
}) {
  const pathname = usePathname()
  const active = isActive(pathname, href)
  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        'h-11 justify-start gap-3 rounded-2xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        active &&
          'bg-foreground text-background hover:bg-foreground hover:text-background dark:bg-primary dark:text-primary-foreground',
      )}
      title={label}
    >
      <Link href={href}>
        <Icon className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </Link>
    </Button>
  )
}

function MobileNavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: typeof Home
}) {
  const pathname = usePathname()
  const active = isActive(pathname, href)
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-muted-foreground transition-colors',
        active && 'text-primary',
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  )
}

function AddExpenseMenu({ mobile = false }: { mobile?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            mobile
              ? '-mt-7 h-14 w-14 shrink-0 rounded-full p-0 shadow-xl shadow-primary/25 ring-4 ring-background'
              : 'h-12 justify-start gap-3 rounded-2xl bg-primary px-4 font-bold shadow-sm',
          )}
          aria-label="New expense"
        >
          <Plus className={cn('h-4 w-4', mobile && 'h-6 w-6')} />
          {!mobile && <span>New expense</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={mobile ? 'center' : 'start'}>
        <DropdownMenuItem asChild>
          <Link href="/friends">With a friend</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/groups/create">In a group</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden border-r bg-card/90 backdrop-blur-xl lg:flex lg:w-[17rem] lg:flex-col xl:w-72">
        <div className="flex h-24 items-center border-b px-6">
          <Link href="/" aria-label={appConfig.name}>
            <LedgerLogo />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-5 p-4">
          <div className="grid gap-1">
            {primaryNav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
          <AddExpenseMenu />
          <div className="mt-auto grid gap-1 border-t pt-4">
            {secondaryNav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </nav>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/" aria-label={appConfig.name}>
          <LedgerLogo compact />
        </Link>
        <Link
          href="/settings#identity"
          className="flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground"
          aria-label="My identity"
        >
          <CircleUserRound className="h-4 w-4" />
        </Link>
      </header>

      <div className="lg:pl-[17rem] xl:pl-72">
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1480px] flex-col px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-16px_40px_rgba(23,23,23,0.08)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-1">
          <MobileNavLink href="/" label="Overview" icon={Home} />
          <MobileNavLink href="/friends" label="Friends" icon={Users} />
          <AddExpenseMenu mobile />
          <MobileNavLink href="/groups" label="Groups" icon={WalletCards} />
          <MobileNavLink href="/activity" label="Activity" icon={Activity} />
        </div>
      </nav>
    </div>
  )
}
