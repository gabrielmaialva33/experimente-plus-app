import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render } from '@testing-library/react-native'

import SignInScreen from '@/app/(tabs)/sign-in'
import ValidateScreen from '@/app/(tabs)/validate'
import { PurchaseAction, PurchasePage } from '@/purchases/components'
import { palette } from '@/theme/tokens'

jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))
jest.mock('@/api/client', () => ({ ApiError: class ApiError extends Error {} }))
jest.mock('@/api/auth', () => ({ signIn: jest.fn() }))
jest.mock('@/session/context', () => ({
  useSession: () => ({ status: 'unavailable', refresh: jest.fn(), signOut: jest.fn() }),
  usePartnerAreas: () => ({ canValidate: true, canReadHistory: false }),
}))
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }), useFocusEffect: jest.fn() }))
jest.mock('expo-camera', () => ({ useCameraPermissions: () => [{ granted: false }, jest.fn()] }))
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual('react-native').View }))

describe.each(['light', 'dark'] as const)('action roles in %s', (mode) => {
  beforeEach(() => jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette[mode]))

  it('uses E1 and primary for navigation and only CTA for purchase conversion', async () => {
    const view = await render(<PurchasePage>
      <PurchaseAction label="Consultar carteira" onPress={jest.fn()} />
      <PurchaseAction label="Iniciar compra" conversion onPress={jest.fn()} />
    </PurchasePage>)
    // E1 >= E0 in both themes; muted would sink below E0 in light mode.
    expect(view.getByRole('button', { name: 'Consultar carteira' })).toHaveStyle({ backgroundColor: palette[mode].surfaceRaised })
    expect(view.getByText('Consultar carteira')).toHaveStyle({ color: palette[mode].primary })
    expect(view.getByRole('button', { name: 'Iniciar compra' })).toHaveStyle({ backgroundColor: palette[mode].cta })
    expect(view.getByText('Iniciar compra')).toHaveStyle({ color: palette[mode].ctaForeground })
  })

  it('does not style login or recovery as conversion', async () => {
    const view = await render(<QueryClientProvider client={new QueryClient()}><SignInScreen /></QueryClientProvider>)
    await fireEvent.changeText(view.getByPlaceholderText('E-mail ou usuário'), 'ana')
    await fireEvent.changeText(view.getByPlaceholderText('Senha'), 'test-password')
    expect(view.getByRole('button', { name: 'Entrar' })).toHaveStyle({ backgroundColor: palette[mode].primary, opacity: 1 })
    expect(view.getByText('Tentar de novo')).toHaveStyle({ color: palette[mode].primary })
  })

  it('keeps camera permission as a utility action', async () => {
    const view = await render(<ValidateScreen />)
    expect(view.getByRole('button', { name: 'Permitir câmera' })).toHaveStyle({ backgroundColor: palette[mode].primary })
    expect(view.getByText('Permitir câmera')).toHaveStyle({ color: palette[mode].primaryForeground })
  })
})
