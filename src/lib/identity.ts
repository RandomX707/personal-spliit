import { appConfig } from '@/config/app'
import { z } from 'zod'

export const identityStorageKey = 'ledger.identity'
export const legacyIdentityStorageKey = 'splitmate.identity'

export const ledgerIdentitySchema = z.object({
  displayName: z.string().min(1).max(80).default(''),
  avatarInitials: z.string().max(4).default(''),
  preferredCurrency: z
    .string()
    .length(3)
    .default(appConfig.defaultCurrency.code),
  upiId: z.string().max(120).optional().default(''),
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  locale: z.string().min(2).default(appConfig.defaultLocale),
})

export type LedgerIdentity = z.infer<typeof ledgerIdentitySchema>

export function getFallbackIdentity(): LedgerIdentity {
  return {
    displayName: '',
    avatarInitials: '',
    preferredCurrency: appConfig.defaultCurrency.code,
    upiId: '',
    theme: 'system',
    locale: appConfig.defaultLocale,
  }
}

export function parseStoredIdentity(value: string | null): LedgerIdentity {
  if (!value) return getFallbackIdentity()
  try {
    return ledgerIdentitySchema.parse(JSON.parse(value))
  } catch {
    return getFallbackIdentity()
  }
}

export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
