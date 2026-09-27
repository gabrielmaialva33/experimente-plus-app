import { compactCardWidth } from '@/components/compact-card'
import { MEASURE } from '@/components/content-frame'
import { ticketStacks } from '@/place/benefit-ticket'
import { spacing } from '@/theme/tokens'

// The ticket's module reaches the purchase catalogue; only its layout rule is under test.
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/api/client', () => ({ ApiError: class ApiError extends Error {} }))
jest.mock('@/purchases/queries', () => ({ usePurchaseEditions: jest.fn() }))

const PHONE_SMALL = 360
const PHONE = 411

describe('cards of a horizontal row', () => {
  it('grow with the text but leave the next card in sight', () => {
    // 220 at 160% is 352: wider than the whole column of a 357 dp phone.
    expect(compactCardWidth(352, 317)).toBe(272)
    expect(compactCardWidth(220, 371)).toBe(220)
  })
})

describe('a benefit ticket', () => {
  it('tears its price under the terms on a narrow phone or with large text', () => {
    expect(ticketStacks(PHONE_SMALL - 2 * spacing.gutter, false)).toBe(true)
    expect(ticketStacks(PHONE - 2 * spacing.gutter, false)).toBe(false)
    expect(ticketStacks(MEASURE.readable, false)).toBe(false)
    expect(ticketStacks(MEASURE.readable, true)).toBe(true)
  })
})
