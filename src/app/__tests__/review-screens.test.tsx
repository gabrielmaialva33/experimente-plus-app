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
  Stack: { Screen: jest.fn(() => null) },
}))
jest.mock('@/reviews/queries', () => ({
  useCreateReviewWithPhotos: jest.fn(),
  useAuthorRules: jest.fn(),
  useReportContent: jest.fn(),
  useReportAnonymously: jest.fn(),
}))
jest.mock('@/session/context', () => ({ useSession: jest.fn() }))
// The real picker opens the system gallery. This one hands back a photo when
// pressed, which is all the screen needs to be exercised.
jest.mock('@/components/image-picker', () => {
  const { Pressable, Text } = jest.requireActual('react-native')
  return {
    ImagePicker: ({ onChange, maxImages, label }: any) => (
      <Pressable
        testID="photo-picker"
        accessibilityLabel={`${label} ${maxImages}`}
        onPress={() =>
          onChange([{ uri: 'file:///prato.jpg', fileName: 'prato.jpg', mimeType: 'image/jpeg', width: 8, height: 6 }])
        }>
        <Text>picker</Text>
      </Pressable>
    ),
  }
})

const params = jest.requireMock('expo-router') as { useLocalSearchParams: jest.Mock; Stack: { Screen: jest.Mock } }
/** The title the screen gives its header. */
const headerTitle = () => params.Stack.Screen.mock.calls[params.Stack.Screen.mock.calls.length - 1]?.[0].options.title
const { palette } = jest.requireActual('@/theme/tokens')
const queries = jest.requireMock('@/reviews/queries') as {
  useCreateReviewWithPhotos: jest.Mock
  useAuthorRules: jest.Mock
  useReportContent: jest.Mock
  useReportAnonymously: jest.Mock
}
const session = jest.requireMock('@/session/context') as { useSession: jest.Mock }

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
  queries.useCreateReviewWithPhotos.mockReturnValue(idle())
  queries.useAuthorRules.mockReturnValue({ data: { max_photos: 0 } })
  queries.useReportContent.mockReturnValue(idle())
  queries.useReportAnonymously.mockReturnValue(idle())
  session.useSession.mockReturnValue({ status: 'authenticated' })
})

it('will not submit a review without a rating', async () => {
  const mutate = jest.fn()
  queries.useCreateReviewWithPhotos.mockReturnValue(idle({ mutate }))

  const view = await render(<WriteReviewScreen />)
  // The comment sits low on the form: it must stay above the keyboard.
  expect(view.getByTestId('keyboard-form')).toBeOnTheScreen()
  await fireEvent.press(view.getByTestId('review-submit'))

  expect(mutate).not.toHaveBeenCalled()
})

it('sends the rating and drops an empty comment rather than posting an empty string', async () => {
  const mutate = jest.fn()
  queries.useCreateReviewWithPhotos.mockReturnValue(idle({ mutate }))

  const view = await render(<WriteReviewScreen />)
  await fireEvent.press(view.getByLabelText('5 de 5, Ótimo'))
  await fireEvent.press(view.getByTestId('review-submit'))

  expect(mutate).toHaveBeenCalledWith(
    { body: { establishment_id: 7, rating: 5 }, photos: [] },
    expect.objectContaining({ onSuccess: expect.any(Function) })
  )
})

it('trims the comment it does send', async () => {
  const mutate = jest.fn()
  queries.useCreateReviewWithPhotos.mockReturnValue(idle({ mutate }))

  const view = await render(<WriteReviewScreen />)
  await fireEvent.press(view.getByLabelText('4 de 5, Bom'))
  await fireEvent.changeText(view.getByTestId('review-comment'), '  ótimo atendimento  ')
  await fireEvent.press(view.getByTestId('review-submit'))

  expect(mutate).toHaveBeenCalledWith(
    { body: { establishment_id: 7, rating: 4, comment: 'ótimo atendimento' }, photos: [] },
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
  expect(view.getByTestId('keyboard-form')).toBeOnTheScreen()
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
  // The title moved to the header; the page no longer repeats it (audit A45).
  expect(headerTitle()).toBe('Denunciar experiência')
  expect(view.queryByText('Denunciar experiência')).toBeNull()
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

it('offers no photo picker where the operation accepts no photos', async () => {
  queries.useAuthorRules.mockReturnValue({ data: { max_photos: 0 } })
  const view = await render(<WriteReviewScreen />)
  expect(view.queryByTestId('photo-picker')).toBeNull()

  // Nor while the rule is still unknown: a picker that may reject everything is
  // worse than none.
  queries.useAuthorRules.mockReturnValue({ data: undefined })
  const loading = await render(<WriteReviewScreen />)
  expect(loading.queryByTestId('photo-picker')).toBeNull()
})

it('sends the chosen photos with the review, up to the operation limit', async () => {
  const mutate = jest.fn()
  queries.useAuthorRules.mockReturnValue({ data: { max_photos: 3 } })
  queries.useCreateReviewWithPhotos.mockReturnValue(idle({ mutate }))

  const view = await render(<WriteReviewScreen />)
  expect(view.getByLabelText('Fotos (até 3) 3')).toBeTruthy()
  await fireEvent.press(view.getByTestId('photo-picker'))
  await fireEvent.press(view.getByLabelText('5 de 5, Ótimo'))
  await fireEvent.press(view.getByTestId('review-submit'))

  expect(mutate).toHaveBeenCalledWith(
    {
      body: { establishment_id: 7, rating: 5 },
      photos: [{ uri: 'file:///prato.jpg', fileName: 'prato.jpg', mimeType: 'image/jpeg' }],
    },
    expect.anything()
  )
})

it('keeps the published review and says which photos did not go', async () => {
  queries.useCreateReviewWithPhotos.mockReturnValue(
    idle({ isSuccess: true, data: { review: { id: 1 }, failed: 2 } })
  )

  const view = await render(<WriteReviewScreen />)

  expect(view.getByText('Avaliação publicada')).toBeTruthy()
  expect(view.getByTestId('review-photos-failed').props.children[0]).toBe(
    '2 fotos não puderam ser enviadas.'
  )
})

it('lets a visitor report anonymously, and says so', async () => {
  const anonymous = jest.fn()
  const identified = jest.fn()
  session.useSession.mockReturnValue({ status: 'anonymous' })
  queries.useReportAnonymously.mockReturnValue(idle({ mutate: anonymous }))
  queries.useReportContent.mockReturnValue(idle({ mutate: identified }))
  params.useLocalSearchParams.mockReturnValue({ type: 'review', id: '3' })

  const view = await render(<ReportContentScreen />)
  expect(view.getByTestId('report-anonymous-note')).toBeTruthy()

  await fireEvent.press(view.getByTestId('reason-harassment'))
  await fireEvent.press(view.getByTestId('report-submit'))

  await waitFor(() =>
    expect(anonymous).toHaveBeenCalledWith({ target_type: 'review', target_id: 3, reason: 'harassment' })
  )
  expect(identified).not.toHaveBeenCalled()
})

it('reports as the account when signed in, and says so', async () => {
  const anonymous = jest.fn()
  const identified = jest.fn()
  queries.useReportAnonymously.mockReturnValue(idle({ mutate: anonymous }))
  queries.useReportContent.mockReturnValue(idle({ mutate: identified }))
  params.useLocalSearchParams.mockReturnValue({ type: 'review', id: '3' })

  const view = await render(<ReportContentScreen />)
  expect(view.getByTestId('report-identified-note')).toBeTruthy()

  await fireEvent.press(view.getByTestId('reason-spam'))
  await fireEvent.press(view.getByTestId('report-submit'))

  await waitFor(() => expect(identified).toHaveBeenCalled())
  expect(anonymous).not.toHaveBeenCalled()
})

it('does not let anyone submit while the session is still being read', async () => {
  session.useSession.mockReturnValue({ status: 'loading' })
  params.useLocalSearchParams.mockReturnValue({ type: 'review', id: '3' })

  const view = await render(<ReportContentScreen />)
  await fireEvent.press(view.getByTestId('reason-spam'))

  expect(view.getByTestId('report-submit').props.accessibilityState).toMatchObject({ disabled: true })
})

it('explains a repeat, a limit and a vanished target in the reporter’s terms', () => {
  const { ApiError: MockApiError } = jest.requireMock('@/api/client') as { ApiError: any }
  const { failureMessage: message } = jest.requireActual('@/app/denunciar/[type]/[id]') as {
    failureMessage: (error: unknown, anonymous: boolean) => string
  }

  expect(message(new MockApiError(409, {}), true)).toMatch(/desta conexão ou deste aparelho/)
  expect(message(new MockApiError(409, {}), false)).toBe('Você já denunciou este conteúdo.')
  expect(message(new MockApiError(429, {}), true)).toMatch(/Muitas denúncias/)
  expect(message(new MockApiError(404, {}), true)).toMatch(/não está mais disponível/)
})

it('names what is reported under a header that says what the form does (A45)', async () => {
  params.useLocalSearchParams.mockReturnValue({ type: 'establishment', id: '1', nome: 'Ateliê do Café' })

  const view = await render(<ReportContentScreen />)

  expect(headerTitle()).toBe('Denunciar este lugar')
  expect(view.getByTestId('report-subject')).toHaveTextContent('Você está denunciandoAteliê do Café')
  expect(view.queryByText('Denunciar este lugar')).toBeNull()
})

it('names the place a review is for, instead of a second "Avaliar" (A45)', async () => {
  params.useLocalSearchParams.mockReturnValue({ establishmentId: '7', nome: 'Ateliê do Café' })

  const view = await render(<WriteReviewScreen />)

  expect(view.getByTestId('review-subject')).toHaveTextContent('Sua avaliação deAteliê do Café')
  expect(view.queryByText('Sua avaliação')).toBeNull()
})

it('offers a place only the reasons that fit a place, each with a visible radio (A46)', async () => {
  params.useLocalSearchParams.mockReturnValue({ type: 'establishment', id: '1' })

  const view = await render(<ReportContentScreen />)

  expect(view.queryByTestId('reason-harassment')).toBeNull()
  expect(view.queryByTestId('reason-conflict_of_interest')).toBeNull()
  expect(view.getByText('Informação falsa ou desatualizada')).toBeTruthy()
  expect(view.getByTestId('reason-spam-radio')).toHaveStyle({ borderColor: palette.light.choiceBorder })

  await fireEvent.press(view.getByTestId('reason-spam'))
  expect(view.getByTestId('reason-spam').props.accessibilityState).toEqual({ selected: true, checked: true })
  expect(view.getByTestId('reason-spam-radio')).toHaveStyle({ borderColor: palette.light.primary })
})

it('keeps the reasons a review can have, conflict of interest included', async () => {
  params.useLocalSearchParams.mockReturnValue({ type: 'reply', id: '9' })
  const reply = await render(<ReportContentScreen />)
  expect(reply.getByTestId('reason-harassment')).toBeTruthy()
  expect(reply.queryByTestId('reason-conflict_of_interest')).toBeNull()
})
