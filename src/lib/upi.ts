export type UpiPaymentInput = {
  upiId: string
  payeeName: string
  amountMinor: number
  currencyCode?: string | null
  note?: string
}

export function amountMinorToMajor(amountMinor: number, currencyCode = 'INR') {
  const digits = currencyCode === 'JPY' ? 0 : 2
  return (amountMinor / 10 ** digits).toFixed(digits)
}

export function createUpiPaymentUri({
  upiId,
  payeeName,
  amountMinor,
  currencyCode = 'INR',
  note = 'SplitMate settlement',
}: UpiPaymentInput) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amountMinorToMajor(amountMinor, currencyCode ?? 'INR'),
    cu: currencyCode ?? 'INR',
    tn: note,
  })
  return `upi://pay?${params.toString()}`
}
