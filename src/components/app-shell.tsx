'use client'

import { SplitMateLogo } from '@/components/splitmate-logo'
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
  Home,
  Plus,
  Settings,
  UserCircle,
  Users,
  WalletCards,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const primaryNav = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/groups', label: 'Groups', icon: WalletCards },
  { href: '/activity', label: 'Activity', icon: Activity },
]

const secondaryNav = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/settings#identity', label: 'My Identity', icon: UserCircle },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href.split('#')[0])
}

function NavLink({
  href,
  label,
  icon: Icon,
  compact = false,
}: {
  href: string
  label: string
  icon: typeof Home
  compact?: boolean
}) {
  const pathname = usePathname()
  const active = isActive(pathname, href)
  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        'h-11 justify-start gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        active &&
          'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
        compact && 'justify-center px-0',
      )}
      title={label}
    >
      <Link href={href}>
        <Icon className="h-4 w-4 shrink-0" />
        {!compact && <span>{label}</span>}
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
        'flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium text-muted-foreground',
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
              ? '-mt-7 h-14 w-14 shrink-0 rounded-full p-0 shadow-lg shadow-primary/25 ring-4 ring-background'
              : 'h-12 justify-start gap-3 rounded-xl shadow-sm',
          )}
          aria-label="Add expense"
        >
          <Plus className={cn('h-4 w-4', mobile && 'h-6 w-6')} />
          {!mobile && <span>Add Expense</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={mobile ? 'center' : 'start'}>
        <DropdownMenuItem asChild>
          <Link href="/friends">Add expense with friend</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/groups/create">Add expense to group</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden border-r bg-card/85 backdrop-blur-xl lg:flex lg:w-72 lg:flex-col xl:w-80">
        <div className="flex h-20 items-center border-b px-6">
          <Link href="/" aria-label={appConfig.name}>
            <SplitMateLogo />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-6 p-4">
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

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/" aria-label={appConfig.name}>
          <SplitMateLogo compact />
        </Link>
        <div className="text-right">
          <div className="text-sm font-semibold">{appConfig.name}</div>
          <div className="text-xs text-muted-foreground">
            {appConfig.tagline}
          </div>
        </div>
      </header>

      <div className="lg:pl-72 xl:pl-80">
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-1">
          <MobileNavLink href="/" label="Home" icon={Home} />
          <MobileNavLink href="/friends" label="Friends" icon={Users} />
          <AddExpenseMenu mobile />
          <MobileNavLink href="/groups" label="Groups" icon={WalletCards} />
          <MobileNavLink href="/activity" label="Activity" icon={Activity} />
        </div>
      </nav>
    </div>
  )
}
