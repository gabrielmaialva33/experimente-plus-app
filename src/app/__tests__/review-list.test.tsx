import { fireEvent, render } from '@testing-library/react-native'

import EstablishmentReviewsScreen from '@/app/avaliacoes/[establishmentId]'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({ useColors: () => jest.requireActual('@/theme/tokens').palette.light }))
const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ establishmentId: '7', nome: 'Ateliê do Café' }),
}))
jest.mock('@/reviews/queries', () => ({ useEstablishmentReviews: jest.fn() }))

const queries = jest.requireMock('@/reviews/queries') as { useEstablishmentReviews: jest.Mock }

beforeEach(() => {
  mockPush.mockClear()
  queries.useEstablishmentReviews.mockReturnValue({
    isPending: false,
    isError: false,
    data: {
      data: [{
        id: 1, rating: 5, comment: 'Café bem preparado.', created_at: '2026-09-26T12:00:00Z',
        author: { id: 4, full_name: 'Ana Ribeiro', username: 'ana' },
        reply: { id: 9, comment: 'Obrigado pela visita!' },
      }],
    },
  })
})

it('names the place, filters by chip and reports a review by name', async () => {
  const view = await render(<EstablishmentReviewsScreen />)

  expect(view.getByRole('header', { name: 'Ateliê do Café' })).toBeOnTheScreen()
  expect(view.getByText('Resposta de Ateliê do Café')).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Todas' }).props.accessibilityState).toEqual({ selected: true })

  await fireEvent.press(view.getByRole('button', { name: '5 estrelas' }))
  expect(queries.useEstablishmentReviews).toHaveBeenLastCalledWith(7, { perPage: 20, rating: 5 })
  expect(view.getByRole('button', { name: '5 estrelas' }).props.accessibilityState).toEqual({ selected: true })

  await fireEvent.press(view.getByRole('button', { name: 'Mais opções da avaliação de Ana Ribeiro' }))
  await fireEvent.press(view.getByText('Denunciar avaliação'))
  expect(mockPush).toHaveBeenCalledWith('/denunciar/review/1?nome=Avalia%C3%A7%C3%A3o%20de%20Ana%20Ribeiro')
})
