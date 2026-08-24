export const appConfig = {
  name: 'SplitMate',
  tagline: 'Expenses made simple.',
  description:
    'A private, mobile-first expense sharing app for friends, groups, receipts, balances, and settlements.',
  defaultCurrency: {
    code: 'INR',
    symbol: '₹',
  },
  defaultLocale: 'en-IN',
  timeZone: 'Asia/Kolkata',
  support: {
    upstreamSource: 'https://github.com/spliit-app/spliit',
    forkSource: 'https://github.com/RandomX707/personal-spliit',
  },
  features: {
    aiReceiptScanning: true,
    aiCategorySuggestion: true,
    uploads: true,
    upiSettlements: true,
  },
} as const

export type AppConfig = typeof appConfig
