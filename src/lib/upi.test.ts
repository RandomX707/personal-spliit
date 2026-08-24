import { amountMinorToMajor, createUpiPaymentUri } from './upi'

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
      note: 'SplitMate settlement',
    })

    expect(uri).toBe(
      'upi://pay?pa=rahul%40oksbi&pn=Rahul+Sharma&am=850.00&cu=INR&tn=SplitMate+settlement',
    )
  })
})
