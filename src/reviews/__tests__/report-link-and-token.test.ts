import { anonymousReportToken } from '@/reviews/anonymous-token'
import { reportHref } from '@/reviews/report-link'

const mockStore = new Map<string, string>()
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockStore.get(key),
    set: (key: string, value: string) => mockStore.set(key, value),
  }),
}))
let mockCounter = 0
jest.mock('expo-crypto', () => ({
  randomUUID: () => `00000000-0000-4000-8000-00000000000${++mockCounter}`,
}))

beforeEach(() => {
  mockStore.clear()
  mockCounter = 0
})

// Everyone reports through the same form, a visitor included; the place page
// test checks that a visitor's "Denunciar este lugar" is not sent to sign in.
it('points every report at the one form and names its subject when there is one', () => {
  expect(reportHref('experience', 31)).toBe('/denunciar/experience/31')
  expect(reportHref('review', 8, null)).toBe('/denunciar/review/8')
  expect(reportHref('review', 8, 'Avaliação de Ana & Bia')).toBe(
    '/denunciar/review/8?nome=Avalia%C3%A7%C3%A3o%20de%20Ana%20%26%20Bia'
  )
})

it('keeps one anonymous token per device', () => {
  const first = anonymousReportToken()
  const second = anonymousReportToken()

  expect(first).toBe(second)
  expect(mockCounter).toBe(1)
})
