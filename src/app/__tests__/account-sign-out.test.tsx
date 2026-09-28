import { fireEvent, render, waitFor } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'

import AccountScreen from '@/app/(tabs)/account'

const mockSignOut = jest.fn(async () => {})

jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: jest.fn(),
  Tabs: { Screen: () => null },
}))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }))
jest.mock('@/session/context', () => ({
  useSession: () => ({
    status: 'authenticated',
    context: { user: { id: 1, full_name: 'Ana Silva', email: 'ana@example.com' } },
    capabilities: {},
    signOut: mockSignOut,
  }),
}))
jest.mock('@/catalog/city-store', () => ({ useSelectedCity: () => null }))
jest.mock('@/catalog/queries', () => ({ useCities: () => ({ data: [] }) }))

// Signing out takes the Conta tab away under the person; the change is said.
it('says the session ended once signing out is done', async () => {
  const view = await render(<AccountScreen />)
  await fireEvent.press(view.getByRole('button', { name: 'Sair' }))
  expect(mockSignOut).toHaveBeenCalledTimes(1)
  await waitFor(() =>
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Você saiu da conta.')
  )
})
