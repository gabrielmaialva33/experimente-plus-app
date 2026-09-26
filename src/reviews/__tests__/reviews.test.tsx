import { fireEvent, render } from '@testing-library/react-native'

import type { Review } from '@/api/reviews'
import { EstablishmentReviews } from '@/reviews/establishment-reviews'
import { ReviewCard, formatDate } from '@/reviews/review-card'
import { Stars, StarsInput } from '@/reviews/stars'
import { palette } from '@/theme/tokens'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({ useColors: () => jest.requireActual('@/theme/tokens').palette.light }))
const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/session/context', () => ({ useSession: jest.fn() }))
jest.mock('@/reviews/queries', () => ({ useEstablishmentReviews: jest.fn() }))

const session = jest.requireMock('@/session/context') as { useSession: jest.Mock }
const queries = jest.requireMock('@/reviews/queries') as { useEstablishmentReviews: jest.Mock }

const review = (overrides: Partial<Review> = {}): Review => ({
  id: 1,
  tenant_id: 1,
  establishment_id: 7,
  user_id: 42,
  rating: 4,
  comment: 'Café muito bom.',
  status: 'published',
  photos_count: 0,
  videos_count: 0,
  created_at: '2026-09-01T12:00:00.000Z',
  updated_at: '2026-09-01T12:00:00.000Z',
  author: { id: 42, full_name: 'Ana Ribeiro', username: 'ana' },
  ...overrides,
})

beforeEach(() => {
  mockPush.mockClear()
  session.useSession.mockReturnValue({ status: 'anonymous' })
  queries.useEstablishmentReviews.mockReturnValue({ data: undefined, isError: false, isPending: false })
})

it('reads a rating as a number rather than as five separate images', async () => {
  const view = await render(<Stars rating={4} />)

  expect(view.getByLabelText('4 de 5')).toBeOnTheScreen()
})

it('draws an average of 4,5 as four stars and a half, and says so', async () => {
  const view = await render(<Stars rating={4.5} />)

  expect(view.getByLabelText('4,5 de 5')).toBeOnTheScreen()
  expect(view.getAllByTestId('star-icon-star', { includeHiddenElements: true })).toHaveLength(4)
  expect(view.getAllByTestId('star-icon-star-half', { includeHiddenElements: true })).toHaveLength(1)
})

it('keeps the place average whole on the page instead of rounding it to a full star', async () => {
  queries.useEstablishmentReviews.mockReturnValue({
    data: { data: [review({ rating: 5 }), review({ id: 2, rating: 4 })], meta: {} },
    isError: false,
    isPending: false,
  })

  const view = await render(
    <EstablishmentReviews establishmentId={7} summary={{ count: 2, average: 4.5 }} />
  )

  expect(view.getByLabelText('4,5 de 5')).toBeOnTheScreen()
})

it('gives every star its own touch target and names the score it sets', async () => {
  const changed = jest.fn()
  const view = await render(<StarsInput rating={0} onChange={changed} />)

  const third = view.getByLabelText('3 de 5, Regular')
  expect(third).toHaveStyle({ minHeight: 48, minWidth: 48 })

  await fireEvent.press(third)
  expect(changed).toHaveBeenCalledWith(3)
})

it('shows the author, the reply and both report entries', async () => {
  const report = jest.fn()
  const view = await render(
    <ReviewCard
      review={review({
        reply: {
          id: 9,
          tenant_id: 1,
          review_id: 1,
          organization_id: 3,
          user_id: 5,
          comment: 'Obrigado pela visita!',
          status: 'published',
          created_at: '2026-09-02T12:00:00.000Z',
          updated_at: null,
        },
      })}
      onReport={report}
    />
  )

  expect(view.getByText('Ana Ribeiro')).toBeOnTheScreen()
  expect(view.getByText('Obrigado pela visita!')).toBeOnTheScreen()

  await fireEvent.press(view.getByText('Denunciar resposta'))
  expect(report).toHaveBeenCalledWith({ type: 'reply', id: 9 })

  await fireEvent.press(view.getByText('Denunciar avaliação'))
  expect(report).toHaveBeenCalledWith({ type: 'review', id: 1 })
})

it('names a review with no author instead of leaving the line blank', async () => {
  const view = await render(<ReviewCard review={review({ author: undefined })} />)

  expect(view.getByText('Visitante')).toBeOnTheScreen()
})

it('offers no report entry when the screen cannot take one', async () => {
  const view = await render(<ReviewCard review={review()} />)

  expect(view.queryByText('Denunciar avaliação')).toBeNull()
})

/**
 * The regression that matters: with pagination the loaded page and the real
 * catalogue disagree, and only the projection knows the establishment's score.
 */
it('shows the average the projection reports, not one computed from the loaded page', async () => {
  queries.useEstablishmentReviews.mockReturnValue({
    data: { data: [review({ rating: 5 })], meta: {} },
    isError: false,
    isPending: false,
  })

  const view = await render(
    <EstablishmentReviews establishmentId={7} summary={{ count: 128, average: 4.2 }} />
  )

  expect(view.getByText('4,2')).toBeOnTheScreen()
  expect(view.getByText('128 avaliações publicadas')).toBeOnTheScreen()
})

it('says there is no rating yet instead of showing a zero', async () => {
  const view = await render(
    <EstablishmentReviews establishmentId={7} summary={{ count: 0, average: null }} />
  )

  expect(view.getByText('Ainda não há avaliações deste lugar.')).toBeOnTheScreen()
  expect(view.queryByText('0,0')).toBeNull()
})

it('sends a visitor to sign in and a member to the form', async () => {
  const anonymous = await render(
    <EstablishmentReviews establishmentId={7} summary={{ count: 0, average: null }} />
  )
  expect(anonymous.getByText('Entrar para avaliar')).toBeOnTheScreen()

  session.useSession.mockReturnValue({ status: 'authenticated' })
  const member = await render(
    <EstablishmentReviews establishmentId={7} summary={{ count: 0, average: null }} />
  )
  expect(member.getByText('Avaliar este lugar')).toBeOnTheScreen()
})

it('keeps the section readable when the listing fails', async () => {
  queries.useEstablishmentReviews.mockReturnValue({ data: undefined, isError: true, isPending: false })

  const view = await render(
    <EstablishmentReviews establishmentId={7} summary={{ count: 3, average: 4 }} />
  )

  expect(view.getByText('Não foi possível carregar as avaliações agora.')).toBeOnTheScreen()
  expect(view.getByText('3 avaliações publicadas')).toBeOnTheScreen()
})

it('does not invent a date from an unparseable value', () => {
  expect(formatDate('not-a-date')).toBe('')
  expect(palette.light.foreground).toBeTruthy()
})

it('lets anyone report a review or its reply from the place itself, before any full list exists', async () => {
  queries.useEstablishmentReviews.mockReturnValue({
    data: {
      data: [
        review({
          reply: {
            id: 9,
            tenant_id: 1,
            review_id: 1,
            organization_id: 3,
            user_id: 5,
            comment: 'Obrigado pela visita!',
            status: 'published',
            created_at: '2026-09-02T12:00:00.000Z',
            updated_at: null,
          },
        }),
      ],
      meta: {},
    },
    isError: false,
    isPending: false,
  })

  const view = await render(
    <EstablishmentReviews establishmentId={7} summary={{ count: 1, average: 4 }} />
  )

  expect(view.queryByText(/Ver todas/)).toBeNull()
  await fireEvent.press(view.getByText('Denunciar avaliação'))
  expect(mockPush).toHaveBeenLastCalledWith('/denunciar/review/1')
  await fireEvent.press(view.getByText('Denunciar resposta'))
  expect(mockPush).toHaveBeenLastCalledWith('/denunciar/reply/9')
})
