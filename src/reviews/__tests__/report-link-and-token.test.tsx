import { fireEvent, render } from '@testing-library/react-native'

import { anonymousReportToken } from '@/reviews/anonymous-token'
import { ReportLink } from '@/reviews/report-link'

jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))

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
  mockPush.mockReset()
  mockStore.clear()
  mockCounter = 0
})

it('takes everyone to the report form, a visitor included', async () => {
  const view = await render(<ReportLink type="experience" id={31} label="Denunciar" />)

  await fireEvent.press(view.getByTestId('report-experience-31'))

  expect(mockPush).toHaveBeenCalledWith('/denunciar/experience/31')
  expect(mockPush).not.toHaveBeenCalledWith('/(tabs)/sign-in')
})

it('keeps one anonymous token per device', () => {
  const first = anonymousReportToken()
  const second = anonymousReportToken()

  expect(first).toBe(second)
  expect(mockCounter).toBe(1)
})
