import { act, fireEvent, render } from '@testing-library/react-native'
import { AccessibilityInfo, FlatList, View } from 'react-native'

import MyReviewsScreen from '@/app/conta/avaliacoes'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
const mockNavigate = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), navigate: mockNavigate }) }))
const mockDelete = { mutate: jest.fn(), isPending: false, isError: false }
jest.mock('@/reviews/queries', () => ({
  useMyReviews: jest.fn(),
  useDeleteReview: () => mockDelete,
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

// Every card has "Editar" and "Excluir": each says which review it acts on.
it('names the review each action acts on', async () => {
  queries.useMyReviews.mockReturnValue({
    isPending: false,
    isError: false,
    data: { data: [review(1, 'published', false)] },
  })

  const view = await render(<MyReviewsScreen />)

  expect(view.getByRole('button', { name: /^Editar avaliação de 23/ })).toBeOnTheScreen()
  expect(view.getByRole('button', { name: /^Excluir avaliação de 23/ })).toBeOnTheScreen()
})

// Audit A34: an empty list is not a dead end.
it('offers a way to start when there is no review yet', async () => {
  queries.useMyReviews.mockReturnValue({
    isPending: false,
    isError: false,
    data: { data: [] },
    refetch: jest.fn(),
  })

  const view = await render(<MyReviewsScreen />)

  expect(view.getByRole('header', { name: 'Nenhuma avaliação ainda' })).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: 'Explorar lugares' }))
  expect(mockNavigate).toHaveBeenCalledWith('/')
})

// Deleting cannot be undone: the card asks first, and says when it failed.
it('deletes a review only after a confirmation in its card', async () => {
  mockDelete.mutate.mockReset()
  mockDelete.isError = false
  queries.useMyReviews.mockReturnValue({
    isPending: false,
    isError: false,
    data: { data: [review(1, 'published', false)] },
  })

  const view = await render(<MyReviewsScreen />)
  await fireEvent.press(view.getByRole('button', { name: /^Excluir avaliação de 23/ }))
  expect(mockDelete.mutate).not.toHaveBeenCalled()
  expect(view.getByText('Excluir esta avaliação?')).toBeOnTheScreen()

  await fireEvent.press(view.getByRole('button', { name: 'Manter' }))
  expect(view.queryByText('Excluir esta avaliação?')).toBeNull()
  expect(mockDelete.mutate).not.toHaveBeenCalled()

  await fireEvent.press(view.getByRole('button', { name: /^Excluir avaliação de 23/ }))
  await fireEvent.press(view.getByRole('button', { name: /^Sim, excluir avaliação de 23/ }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(1, expect.any(Object))
})

it('says a deletion failed, and offers no actions on a deleted review', async () => {
  mockDelete.isError = true
  queries.useMyReviews.mockReturnValue({
    isPending: false,
    isError: false,
    data: { data: [review(1, 'published', false), review(2, 'archived', false)] },
  })

  const view = await render(<MyReviewsScreen />)
  await fireEvent.press(view.getByTestId('delete-review-1'))
  expect(view.getByText('Não foi possível excluir agora. Tente de novo.')).toBeOnTheScreen()
  expect(view.queryByTestId('delete-review-2')).toBeNull()
  expect(view.getByTestId('my-review-2')).toHaveTextContent(/Excluída/)
  mockDelete.isError = false
})

// At the foot of the list a card's question grew under the fold, its buttons with it.
it('brings a delete question whole into view, and says it', async () => {
  type Locate = (this: { props: { testID?: string } }, done: (...frame: number[]) => void) => void
  const proto = View.prototype as unknown as { measureInWindow: Locate }
  const original = proto.measureInWindow
  // The list's frame is 700 tall, 80 down the window; the question opens 620 into it.
  proto.measureInWindow = function (done) {
    if (this.props.testID === 'delete-review-confirmation-1') done(16, 700, 358, 200)
    else done(0, 80, 390, 700)
  }
  const scrollToOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation()
  mockDelete.isError = false
  queries.useMyReviews.mockReturnValue({
    isPending: false,
    isError: false,
    data: { data: [review(1, 'published', false)] },
  })

  try {
    const view = await render(<MyReviewsScreen />)
    await fireEvent.press(view.getByTestId('delete-review-1'))
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Excluir esta avaliação? Ela sai da página do lugar, com as fotos. Não dá para desfazer.'
    )

    await fireEvent(view.getByTestId('delete-review-confirmation-1'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 120, width: 358, height: 200 } },
    })
    await act(async () => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(scrollToOffset).toHaveBeenCalledWith({
      offset: 700 - 80 + 200 + 24 - 700,
      animated: true,
    })
  } finally {
    proto.measureInWindow = original
    scrollToOffset.mockRestore()
  }
})
