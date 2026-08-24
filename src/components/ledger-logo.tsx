import { appConfig } from '@/config/app'
import { cn } from '@/lib/utils'

export function LedgerMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={`${appConfig.name} logo`}
      className={cn('h-9 w-9', className)}
    >
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="13"
        className="fill-foreground"
      />
      <path
        d="M14 16h20M14 24h20M14 32h20"
        className="stroke-background"
        fill="none"
        strokeLinecap="round"
        strokeWidth="3.4"
      />
      <path
        d="M19 11v26"
        fill="none"
        stroke="#7c6cff"
        strokeLinecap="round"
        strokeWidth="3.4"
      />
      <path
        d="M29 11v26"
        fill="none"
        stroke="#2fba7f"
        strokeLinecap="round"
        strokeWidth="3.4"
      />
    </svg>
  )
}

export function LedgerLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LedgerMark />
      {!compact && (
        <div className="leading-none">
          <div className="text-[1.05rem] font-black tracking-[0.18em]">
            {appConfig.name}
          </div>
          <div className="mt-1 text-[11px] font-medium text-muted-foreground">
            {appConfig.tagline}
          </div>
        </div>
      )}
    </div>
  )
}
