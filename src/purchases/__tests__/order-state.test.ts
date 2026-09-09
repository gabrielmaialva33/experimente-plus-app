import type { Purchase } from '@/api/purchases'
import { checkoutUrl, orderState } from '../order-state'

jest.mock('@/api/client', () => ({ request: jest.fn() }))

const pending: Purchase = {
  offer_id: null, product_type: 'edition', refunded_cents: 0, refunds: [],
  id: '98b8ff53-9cd5-4a48-9f32-731a11cbe7f1', edition_id: 2, amount_cents: 12300, currency: 'BRL', method: 'pix',
  status: 'pending', access_id: null, paid_at: null, financially_blocked: false,
  created_at: '2026-09-07T00:00:00Z', expires_at: '2026-09-07T00:15:00Z',
  instructions: { pix_url: 'https://checkout.example.com/order' },
  snapshot: {
    offer_id: null, product_type: 'edition', amount_cents: 12300, currency: 'BRL',
    name: 'Edição', description: null, sales_starts_at: '2026-09-01T00:00:00Z', sales_ends_at: '2026-09-30T00:00:00Z',
    usage_starts_at: '2026-10-01T00:00:00Z', usage_ends_at: '2026-12-31T00:00:00Z', terms_version: 'a'.repeat(64), offers: [],
  },
}

describe('purchase state projection', () => {
  it('does not expire a pending order or grant access from the device clock', () => {
    expect(orderState(pending)).toBe('pending')
    expect(orderState({ ...pending, expires_at: '2000-01-01T00:00:00Z' })).toBe('pending')
  })

  it('requires confirmed payment and the server access link', () => {
    expect(orderState({ ...pending, access_id: 1 })).toBe('pending')
    expect(orderState({ ...pending, status: 'paid' })).toBe('late_confirmation')
    expect(orderState({ ...pending, status: 'paid', access_id: 1 })).toBe('confirmed')
  })

  it('follows pending → failed → late confirmation → confirmed server observations', () => {
    const observations: Purchase[] = [
      pending,
      { ...pending, status: 'failed' },
      { ...pending, status: 'review', paid_at: '2026-09-07T00:14:00Z' },
      { ...pending, status: 'paid', paid_at: '2026-09-07T00:14:00Z', access_id: 1 },
    ]
    expect(observations.map(orderState)).toEqual(['pending', 'failed', 'late_confirmation', 'confirmed'])
  })

  it('does not lose a payment observed after a failure without a grant', () => {
    expect(orderState({ ...pending, status: 'failed', paid_at: '2026-09-07T00:14:00Z' })).toBe('late_confirmation')
  })

  it.each(['edition', 'offer'] as const)('prioritizes refund or financial hold for %s', (product_type) => {
    const order = { ...pending, product_type, offer_id: product_type === 'offer' ? 3 : null }
    expect(orderState({ ...order, status: 'paid', access_id: 1, financially_blocked: true })).toBe('blocked')
    expect(orderState({ ...order, status: 'refunded', access_id: 1, financially_blocked: true })).toBe('refunded')
    expect(orderState({ ...order, status: 'paid', access_id: null })).toBe('late_confirmation')
    expect(orderState({ ...order, status: 'cancelled' })).toBe('failed')
  })

  it('only offers a server HTTPS checkout for a pending order', () => {
    expect(checkoutUrl(pending)).toBe('https://checkout.example.com/order')
    expect(checkoutUrl({ ...pending, status: 'paid', access_id: 1 })).toBeNull()
    expect(checkoutUrl({ ...pending, financially_blocked: true })).toBeNull()
    for (const pix_url of ['javascript:alert(1)', 'http://example.com', 'https://user:secret@example.com']) {
      expect(checkoutUrl({ ...pending, instructions: { pix_url } })).toBeNull()
    }
  })
})
