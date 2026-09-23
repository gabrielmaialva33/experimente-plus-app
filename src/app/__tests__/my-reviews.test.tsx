import { render } from '@testing-library/react-native'

import MyReviewsScreen from '@/app/conta/avaliacoes'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/reviews/queries', () => ({
  useMyReviews: jest.fn(),
  useDeleteReview: () => ({ mutate: jest.fn(), isPending: false }),
}))

const queries = jest.requireMock('@/reviews/queries') as { useMyReviews: jest.Mock }

const review = (id: number, status: string, awaiting: boolean) => ({
  id,
  rating: 4,
  status,
  comment: `Avaliação ${id}`,
  created_at: '2026-09-23T12:00:00.000Z',
  edited_at: null,
  awaiting_moderation: awaiting,
})

it('says a review held by a rule is under review, not hidden by a person', async () => {
  queries.useMyReviews.mockReturnValue({
    isPending: false,
    isError: false,
    data: {
      data: [review(1, 'hidden', true), review(2, 'hidden', false), review(3, 'published', false)],
    },
  })

  const view = await render(<MyReviewsScreen />)

  expect(view.getByTestId('my-review-1')).toHaveTextContent(/Em análise/)
  expect(view.getByTestId('my-review-2')).toHaveTextContent(/Oculta pela moderação/)
  expect(view.getByTestId('my-review-3')).toHaveTextContent(/Publicada/)
})
