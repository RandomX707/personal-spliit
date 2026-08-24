import { appConfig } from '@/config/app'
import { cn } from '@/lib/utils'

export function SplitMateMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={`${appConfig.name} logo`}
      className={cn('h-9 w-9', className)}
    >
      <defs>
        <linearGradient id="splitmate-mark" x1="10" x2="38" y1="8" y2="40">
          <stop stopColor="#0f172a" />
          <stop offset="1" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#splitmate-mark)" />
      <circle
        cx="19"
        cy="23"
        r="9"
        fill="none"
        stroke="white"
        strokeOpacity=".92"
        strokeWidth="3.5"
      />
      <circle
        cx="29"
        cy="25"
        r="9"
        fill="none"
        stroke="white"
        strokeOpacity=".72"
        strokeWidth="3.5"
      />
      <path
        d="M15 35h14a6 6 0 0 0 6-6v-1"
        fill="none"
        stroke="#99f6e4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="m31 24 4 4 4-4"
        fill="none"
        stroke="#99f6e4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  )
}

export function SplitMateLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <SplitMateMark />
      {!compact && (
        <div className="leading-tight">
          <div className="text-base font-semibold tracking-normal">
            {appConfig.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {appConfig.tagline}
          </div>
        </div>
      )}
    </div>
  )
}
