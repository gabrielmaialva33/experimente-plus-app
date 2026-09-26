import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render } from '@testing-library/react-native'

import SignInScreen from '@/app/(tabs)/sign-in'
import { CityAgenda } from '@/catalog/city-agenda'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').View }))
jest.mock('@/theme/use-colors', () => ({ useColors: () => jest.requireActual('@/theme/tokens').palette.light }))
jest.mock('@/api/client', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number) {
      super(`request failed with ${status}`)
      this.status = status
    }
  },
}))
jest.mock('@/api/auth', () => ({ signIn: jest.fn() }))
jest.mock('@/api/config', () => ({ resolveMediaUrl: (url: string) => url }))
jest.mock('@/session/context', () => ({
  useSession: () => ({ status: 'anonymous', refresh: jest.fn(), signOut: jest.fn() }),
}))
jest.mock('@/catalog/queries', () => ({ useCityAgenda: jest.fn() }))
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual('react-native').View }))

const { ApiError } = jest.requireMock('@/api/client') as { ApiError: new (status: number) => Error }
const auth = jest.requireMock('@/api/auth') as { signIn: jest.Mock }
const catalog = jest.requireMock('@/catalog/queries') as { useCityAgenda: jest.Mock }

it('refuses credentials without saying which of the two was wrong', async () => {
  auth.signIn.mockRejectedValue(new ApiError(400))
  const client = new QueryClient()
  const view = await render(<QueryClientProvider client={client}><SignInScreen /></QueryClientProvider>)
  await fireEvent.changeText(view.getByPlaceholderText('E-mail ou usuário'), 'ana')
  await fireEvent.changeText(view.getByPlaceholderText('Senha'), 'test-password')
  await fireEvent.press(view.getByRole('button', { name: 'Entrar' }))

  expect(await view.findByText('Dados de acesso incorretos.')).toBeOnTheScreen()
  client.clear()
})

it('describes the new experiences band by recency', async () => {
  catalog.useCityAgenda.mockReturnValue({
    isPending: false,
    data: {
      city: { slug: 'londrina', name: 'Londrina', stateCode: 'PR', timeZone: 'America/Sao_Paulo' },
      localDate: '2026-09-26',
      happeningToday: [],
      upcoming: [],
      newExperiences: [{
        kind: 'experience', id: 1, title: 'Menu de primavera', description: null, cover: null,
        establishmentName: 'Casa de Petiscos', establishmentSlug: 'casa', citySlug: 'londrina',
        publishedAt: '2026-09-25T15:00:00Z',
      }],
      isEmpty: false,
    },
  })
  const view = await render(<CityAgenda citySlug="londrina" />)

  expect(view.getByText('Novidades')).toBeOnTheScreen()
  expect(view.getByText('Publicados recentemente')).toBeOnTheScreen()
})
