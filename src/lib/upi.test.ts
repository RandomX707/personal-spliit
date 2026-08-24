import { amountMinorToMajor, createUpiPaymentUri } from './upi'
import { isPlausibleUpiId } from './upi-validation'

describe('UPI helpers', () => {
  it('formats minor units as major currency amounts', () => {
    expect(amountMinorToMajor(85000, 'INR')).toBe('850.00')
  })

  it('generates an encoded UPI payment URI without implying settlement', () => {
    const uri = createUpiPaymentUri({
      upiId: 'rahul@oksbi',
      payeeName: 'Rahul Sharma',
      amountMinor: 85000,
      currencyCode: 'INR',
      note: 'LEDGER settlement',
    })

    expect(uri).toBe(
      'upi://pay?pa=rahul%40oksbi&pn=Rahul+Sharma&am=850.00&cu=INR&tn=LEDGER+settlement',
    )
  })

  it('encodes special characters in payee names and notes', () => {
    const uri = createUpiPaymentUri({
      upiId: 'custom.handle@provider',
      payeeName: 'Rahul & Co',
      amountMinor: 120050,
      currencyCode: 'INR',
      note: 'Dinner + cab / LEDGER',
    })

    expect(uri).toBe(
      'upi://pay?pa=custom.handle%40provider&pn=Rahul+%26+Co&am=1200.50&cu=INR&tn=Dinner+%2B+cab+%2F+LEDGER',
    )
  })

  it('accepts common plausible VPA shapes', () => {
    expect(isPlausibleUpiId('name@bank')).toBe(true)
    expect(isPlausibleUpiId('9876543210@upi')).toBe(true)
    expect(isPlausibleUpiId('custom.handle@provider')).toBe(true)
  })

  it('rejects missing, invalid, and injection-shaped UPI IDs', () => {
    expect(isPlausibleUpiId('')).toBe(false)
    expect(isPlausibleUpiId('not-a-vpa')).toBe(false)
    expect(isPlausibleUpiId('rahul@oksbi&am=1')).toBe(false)
    expect(isPlausibleUpiId('javascript:alert(1)@upi')).toBe(false)
    expect(() =>
      createUpiPaymentUri({
        upiId: 'rahul@oksbi&am=1',
        payeeName: 'Rahul',
        amountMinor: 85000,
      }),
    ).toThrow('Invalid UPI ID')
  })
})
