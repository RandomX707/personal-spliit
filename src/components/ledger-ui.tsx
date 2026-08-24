import { Currency } from '@/lib/currency'
import { CurrencyAmount } from '@/lib/splitmate/personal-ledger'
import { cn, formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="truncate text-3xl font-black tracking-[-0.02em] text-foreground sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  )
}

export function SectionHeader({
  title,
  actionHref,
  actionLabel = 'View all',
}: {
  title: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h2>
      {actionHref && (
        <Link
          href={actionHref}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

export function InitialAvatar({
  name,
  avatar,
  size = 'md',
}: {
  name: string
  avatar?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClass =
    size === 'lg'
      ? 'h-[4.5rem] w-[4.5rem] text-xl'
      : size === 'sm'
        ? 'h-9 w-9'
        : 'h-11 w-11'
  const text = (avatar || name.slice(0, 2)).toUpperCase()
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-black text-background',
        sizeClass,
      )}
    >
      {text}
    </div>
  )
}

export function LedgerAmount({
  amount,
  currency,
  locale,
  signed = false,
  className,
}: {
  amount: number
  currency: Pick<CurrencyAmount, 'currency' | 'currencyCode'> | Currency
  locale: string
  signed?: boolean
  className?: string
}) {
  const resolvedCurrency =
    'code' in currency ? currency : getCurrencyFromGroup(currency)
  const sign = signed && amount > 0 ? '+' : ''
  return (
    <span className={cn('money-nums whitespace-nowrap', className)}>
      {sign}
      {amount < 0 ? '-' : ''}
      {formatCurrency(resolvedCurrency, Math.abs(amount), locale)}
    </span>
  )
}

export function BalanceTone({
  amount,
  children,
  className,
}: {
  amount: number
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        amount > 0 && 'text-positive',
        amount < 0 && 'text-negative',
        amount === 0 && 'text-balance-neutral',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed bg-card/70 px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-black tracking-[-0.01em]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
