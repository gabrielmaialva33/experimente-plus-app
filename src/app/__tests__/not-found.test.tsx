import { fireEvent, render } from '@testing-library/react-native'

import NotFoundScreen from '@/app/+not-found'

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Stack: { Screen: jest.fn(() => null) },
}))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))

it('answers a link to no screen in Portuguese and leads to Explorar', async () => {
  const view = await render(<NotFoundScreen />)
  const { Stack } = jest.requireMock('expo-router') as { Stack: { Screen: jest.Mock } }
  expect(Stack.Screen.mock.calls.at(-1)[0].options).toEqual({ title: 'Link não encontrado' })
  expect(view.getByRole('header', { name: 'Não encontramos esta página' })).toBeOnTheScreen()
  expect(view.queryByText(/Unmatched|Sitemap/)).toBeNull()
  await fireEvent.press(view.getByRole('button', { name: 'Ir para Explorar' }))
  expect(mockReplace).toHaveBeenCalledWith('/')
})
