import { spentBenefit, usedAt } from '../benefit-use'
import type { Wallet, WalletBenefit } from '../types'

const benefit = {
  access_id: 1,
  offer_id: 2,
  availability: 'redeemed',
  title: 'Sobremesa em dobro',
  establishment: { id: 1, public_name: 'Café da Praça', slug: 'cafe' },
  latest_redemption: {
    id: '7',
    receipt_code: 'EXP-0123456789ABCDEF',
    redeemed_at: '2026-09-28T17:32:00Z',
  },
} as WalletBenefit
const wallet = (changes: Partial<WalletBenefit> = {}) =>
  ({
    passes: [
      {
        access: { id: 1 },
        edition: { city: { timezone: 'America/Sao_Paulo' } },
        benefits: [{ ...benefit, ...changes }],
      },
    ],
  }) as unknown as Wallet

it('names the use that spent a benefit, from the wallet alone', () => {
  expect(spentBenefit(wallet(), 1, 2)).toEqual({
    title: 'Sobremesa em dobro',
    place: 'Café da Praça',
    latest: { receiptCode: 'EXP-0123456789ABCDEF', redeemedAt: '2026-09-28T17:32:00Z' },
    timeZone: 'America/Sao_Paulo',
  })
  expect(spentBenefit(wallet({ latest_redemption: null }), 1, 2)?.latest).toBeNull()
})

it('is not a use for any other reason, nor for another benefit', () => {
  for (const availability of ['available', 'expired', 'paused', 'revoked'] as const)
    expect(spentBenefit(wallet({ availability }), 1, 2)).toBeNull()
  expect(spentBenefit(wallet(), 404, 2)).toBeNull()
  expect(spentBenefit(wallet(), 1, 404)).toBeNull()
})

it('reads the time of use on the city clock and never guesses one', () => {
  expect(usedAt('2026-09-28T17:32:00Z', 'America/Sao_Paulo')).toBe('28/09/2026 às 14:32')
  // An unknown zone keeps the time, on the pilot's clock.
  expect(usedAt('2026-09-28T17:32:00Z', 'Nowhere/Unknown')).toBe('28/09/2026 às 14:32')
  expect(usedAt('', 'America/Sao_Paulo')).toBeNull()
})
