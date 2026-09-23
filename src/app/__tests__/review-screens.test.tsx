import { fireEvent, render, waitFor } from '@testing-library/react-native'

import WriteReviewScreen, { failureMessage } from '@/app/avaliar/[establishmentId]'
import ReportContentScreen from '@/app/denunciar/[type]/[id]'
import { ApiError } from '@/api/client'

// MMKV is a native module, and `@/api/client` reaches it through the session
// store. The screens only ever read `status` and `body` off an error.
jest.mock('@/api/client', () => ({
  ApiError: class ApiError extends Error {
    status: number
    body: unknown

    constructor(status: number, body: unknown) {
      super(`request failed with ${status}`)
      this.status = status
      this.body = body
    }
  },
}))

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({ useColors: () => jest.requireActual('@/theme/tokens').palette.light }))
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: jest.fn(),
}))
jest.mock('@/reviews/queries', () => ({
  useCreateReview: jest.fn(),
  useReportContent: jest.fn(),
}))

const params = jest.requireMock('expo-router') as { useLocalSearchParams: jest.Mock }
const queries = jest.requireMock('@/reviews/queries') as {
  useCreateReview: jest.Mock
  useReportContent: jest.Mock
}

const idle = (overrides = {}) => ({
  mutate: jest.fn(),
  isPending: false,
  isError: false,
  isSuccess: false,
  error: null,
  data: undefined,
  ...overrides,
})

beforeEach(() => {
  params.useLocalSearchParams.mockReturnValue({ establishmentId: '7', type: 'review', id: '3' })
  queries.useCreateReview.mockReturnValue(idle())
  queries.useReportContent.mockReturnValue(idle())
})

it('will not submit a review without a rating', async () => {
  const mutate = jest.fn()
  queries.useCreateReview.mockReturnValue(idle({ mutate }))

  const view = await render(<WriteReviewScreen />)
  await fireEvent.press(view.getByTestId('review-submit'))

  expect(mutate).not.toHaveBeenCalled()
})

it('sends the rating and drops an empty comment rather than posting an empty string', async () => {
  const mutate = jest.fn()
  queries.useCreateReview.mockReturnValue(idle({ mutate }))

  const view = await render(<WriteReviewScreen />)
  await fireEvent.press(view.getByLabelText('5 de 5, Ótimo'))
  await fireEvent.press(view.getByTestId('review-submit'))

  expect(mutate).toHaveBeenCalledWith(
    { establishment_id: 7, rating: 5 },
    expect.objectContaining({ onSuccess: expect.any(Function) })
  )
})

it('trims the comment it does send', async () => {
  const mutate = jest.fn()
  queries.useCreateReview.mockReturnValue(idle({ mutate }))

  const view = await render(<WriteReviewScreen />)
  await fireEvent.press(view.getByLabelText('4 de 5, Bom'))
  await fireEvent.changeText(view.getByTestId('review-comment'), '  ótimo atendimento  ')
  await fireEvent.press(view.getByTestId('review-submit'))

  expect(mutate).toHaveBeenCalledWith(
    { establishment_id: 7, rating: 4, comment: 'ótimo atendimento' },
    expect.anything()
  )
})

/**
 * Policy limits live on the server and change per tenant, so the message the
 * server wrote is repeated instead of being guessed at locally.
 */
it('repeats the rule the server enforced', () => {
  expect(failureMessage(new ApiError(400, { message: 'Review text must be at least 20 characters' })))
    .toBe('Review text must be at least 20 characters')
  expect(failureMessage(new ApiError(409, {}))).toContain('já avaliou')
  expect(failureMessage(new ApiError(429, {}))).toContain('Muitas tentativas')
  expect(failureMessage(new Error('offline'))).toBe('Não foi possível enviar sua avaliação agora.')
})

it('shows the protocol so the report can be followed up', async () => {
  queries.useReportContent.mockReturnValue(
    idle({ isSuccess: true, data: { protocol_number: 'DEN-20260918-000042' } })
  )

  const view = await render(<ReportContentScreen />)

  expect(view.getByTestId('report-protocol')).toHaveTextContent('DEN-20260918-000042')
})

it('requires a reason before sending a report', async () => {
  const mutate = jest.fn()
  queries.useReportContent.mockReturnValue(idle({ mutate }))

  const view = await render(<ReportContentScreen />)
  await fireEvent.press(view.getByTestId('report-submit'))
  expect(mutate).not.toHaveBeenCalled()

  await fireEvent.press(view.getByTestId('reason-spam'))
  await fireEvent.press(view.getByTestId('report-submit'))

  await waitFor(() =>
    expect(mutate).toHaveBeenCalledWith({ target_type: 'review', target_id: 3, reason: 'spam' })
  )
})

it('reports a reply as a reply, not as the review it hangs under', async () => {
  // `reply`, the value the server accepts. This test used to assert
  // `review_reply`, the value the document advertised, and passed while every
  // real report of a reply was refused with 422 — it checked what the app sent,
  // not what the server takes.
  const mutate = jest.fn()
  params.useLocalSearchParams.mockReturnValue({ type: 'reply', id: '9' })
  queries.useReportContent.mockReturnValue(idle({ mutate }))

  const view = await render(<ReportContentScreen />)
  await fireEvent.press(view.getByTestId('reason-offensive'))
  await fireEvent.press(view.getByTestId('report-submit'))

  await waitFor(() =>
    expect(mutate).toHaveBeenCalledWith({
      target_type: 'reply',
      target_id: 9,
      reason: 'offensive',
    })
  )
})

it('refuses a type it does not know instead of reporting a review with that number', async () => {
  const mutate = jest.fn()
  params.useLocalSearchParams.mockReturnValue({ type: 'review_reply', id: '9' })
  queries.useReportContent.mockReturnValue(idle({ mutate }))

  const view = await render(<ReportContentScreen />)

  expect(view.getByTestId('report-unsupported')).toBeTruthy()
  expect(view.queryByTestId('report-submit')).toBeNull()
  expect(mutate).not.toHaveBeenCalled()
})

it('reports partner content under its own kind', async () => {
  const mutate = jest.fn()
  params.useLocalSearchParams.mockReturnValue({ type: 'experience', id: '31' })
  queries.useReportContent.mockReturnValue(idle({ mutate }))

  const view = await render(<ReportContentScreen />)
  expect(view.getByText('Denunciar experiência')).toBeTruthy()
  await fireEvent.press(view.getByTestId('reason-spam'))
  await fireEvent.press(view.getByTestId('report-submit'))

  await waitFor(() =>
    expect(mutate).toHaveBeenCalledWith({ target_type: 'experience', target_id: 31, reason: 'spam' })
  )
})

it('offers only reasons the server accepts', async () => {
  params.useLocalSearchParams.mockReturnValue({ type: 'review', id: '3' })

  const view = await render(<ReportContentScreen />)

  for (const reason of [
    'spam',
    'offensive',
    'inappropriate',
    'false_information',
    'conflict_of_interest',
    'harassment',
    'other',
  ]) {
    expect(view.getByTestId(`reason-${reason}`)).toBeTruthy()
  }
  expect(view.queryByTestId('reason-fake')).toBeNull()
  expect(view.queryByTestId('reason-privacy_violation')).toBeNull()
})
