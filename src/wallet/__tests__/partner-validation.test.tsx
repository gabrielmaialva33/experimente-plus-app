import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'

import ConfirmScreen from '@/app/validar/confirmar'

const mockRouter = {
  back: jest.fn(),
  setParams: jest.fn(),
  push: jest.fn(),
  navigate: jest.fn(),
  canGoBack: () => true,
}
const mockToken = `${'a'.repeat(20)}.${'b'.repeat(43)}`
const mockParams: { token?: string } = { token: mockToken }

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
const mockAreas = { canValidate: true, canReadHistory: true }
const mockSession = { status: 'authenticated', context: { user: { id: 7 } }, refresh: jest.fn() }
jest.mock('@/session/context', () => ({
  useSession: () => mockSession,
  usePartnerAreas: () => mockAreas,
}))
jest.mock('@/api/client', () => ({ ApiError: jest.requireActual('@/api/transport').ApiError }))
jest.mock('@/api/redemptions', () => ({
  previewRedemption: jest.fn(),
  confirmRedemption: jest.fn(),
}))

const redemptions = jest.requireMock('@/api/redemptions') as {
  previewRedemption: jest.Mock
  confirmRedemption: jest.Mock
}

let client: QueryClient

function page() {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  })
  return render(
    <QueryClientProvider client={client}>
      <ConfirmScreen />
    </QueryClientProvider>
  )
}

const previewOf = () => ({
  token: mockToken,
  holder: { full_name: 'Ana Souza' },
  benefit: {
    establishment_name: 'Café',
    offer_title: 'Item em dobro',
    edition_name: 'Pacote Londrina',
    remaining_redemptions: 1,
    terms: null,
  },
})

beforeEach(() => {
  jest.clearAllMocks()
  mockParams.token = mockToken
  mockAreas.canValidate = true
  mockSession.status = 'authenticated'
})

// A28: the partner reads the same vocabulary as the customer — "Pacote", not "Edição".
it('shows the customer, the benefit and its package before an explicit confirmation', async () => {
  redemptions.previewRedemption.mockResolvedValue({
    token: mockToken,
    holder: { full_name: 'Ana Souza' },
    benefit: {
      establishment_name: 'Café',
      offer_title: 'Item em dobro',
      edition_name: 'Pacote Londrina',
      remaining_redemptions: 1,
      terms: null,
    },
  })
  const view = await page()
  expect(await view.findByText('Ana Souza')).toBeOnTheScreen()
  expect(view.getByText('Pacote')).toBeOnTheScreen()
  expect(view.queryByText('Edição')).toBeNull()
  expect(view.getByText('Item em dobro')).toBeOnTheScreen()
  expect(view.getByRole('button', { name: 'Confirmar utilização' })).toBeOnTheScreen()
  expect(redemptions.confirmRedemption).not.toHaveBeenCalled()
})

// A refused code leads back to the reader from a real button, not a bare text press.
it('returns to the reader from a button when the code is refused', async () => {
  const { ApiError } = jest.requireMock('@/api/client') as typeof import('@/api/transport')
  redemptions.previewRedemption.mockRejectedValue(new ApiError(422, null))
  const view = await page()
  expect(
    await view.findByText('Este código não vale mais. Peça ao cliente para gerar um novo.')
  ).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: 'Voltar ao leitor' }))
  expect(mockRouter.back).toHaveBeenCalledTimes(1)
  // The reason replaced the screen the partner was waiting for, so it is said.
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
    'Este código não vale mais. Peça ao cliente para gerar um novo.'
  )
})

// Confirming is the partner's one deliberate act; its outcome is said, and never the token.
it('says the use was registered, with its receipt, once it is confirmed', async () => {
  redemptions.previewRedemption.mockResolvedValue({
    token: mockToken,
    holder: { full_name: 'Ana Souza' },
    benefit: {
      establishment_name: 'Café',
      offer_title: 'Item em dobro',
      edition_name: 'Pacote Londrina',
      remaining_redemptions: 1,
      terms: null,
    },
  })
  redemptions.confirmRedemption.mockResolvedValue({
    receipt_code: 'EXP-1234',
    holder: { full_name: 'Ana Souza' },
    establishment: { name: 'Café' },
    offer: { title: 'Item em dobro', terms: null },
    edition: { name: 'Pacote Londrina' },
    redemption_number: 1,
    redeemed_at: '2026-09-26T12:00:00Z',
  })
  const view = await page()
  await fireEvent.press(await view.findByRole('button', { name: 'Confirmar utilização' }))
  expect(await view.findByText('EXP-1234')).toBeOnTheScreen()
  const said = AccessibilityInfo.announceForAccessibility as jest.Mock
  expect(said).toHaveBeenCalledWith('Utilização registrada. Comprovante EXP-1234.')
  expect(said.mock.calls.flat().join(' ')).not.toContain(mockToken)
})

// Validar depends on `partner.redemptions.validate`, and a link can open the
// confirmation on its own: without the capability nothing reaches the server.
it('asks nothing of the server for an account that cannot validate', async () => {
  mockAreas.canValidate = false
  redemptions.previewRedemption.mockResolvedValue(previewOf())
  const view = await page()
  expect(
    await view.findByText('Sua conta não tem permissão para validar benefícios.')
  ).toBeOnTheScreen()
  expect(redemptions.previewRedemption).not.toHaveBeenCalled()
  // The route still lets go of what it carried.
  expect(mockRouter.setParams).toHaveBeenCalledWith({ token: undefined })
})

it('waits for the session before reading the presentation', async () => {
  mockSession.status = 'loading'
  redemptions.previewRedemption.mockResolvedValue(previewOf())
  const view = await page()
  expect(view.getByRole('progressbar', { name: 'Carregando apresentação' })).toBeOnTheScreen()
  expect(redemptions.previewRedemption).not.toHaveBeenCalled()
})

// The scanner hands over only a token; a link carrying anything else is refused
// as a stale code instead of being sent to the API.
it('never sends what a link carries unless it is shaped like a token', async () => {
  mockParams.token = 'https://example.test/?token=whatever'
  const view = await page()
  expect(
    await view.findByText('Este código não vale mais. Peça ao cliente para gerar um novo.')
  ).toBeOnTheScreen()
  expect(redemptions.previewRedemption).not.toHaveBeenCalled()
})

// A preview is a read: a failure that is not a refusal can be asked again, with the same token.
it('offers a new attempt when the preview did not reach an answer', async () => {
  redemptions.previewRedemption
    .mockRejectedValueOnce(new TypeError('Network request failed'))
    .mockResolvedValueOnce(previewOf())
  const view = await page()
  expect(await view.findByText('Não foi possível ler este código agora.')).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: 'Tentar de novo' }))
  expect(await view.findByText('Ana Souza')).toBeOnTheScreen()
  expect(redemptions.previewRedemption.mock.calls.map(([value]) => value)).toEqual([
    mockToken,
    mockToken,
  ])
  expect(redemptions.confirmRedemption).not.toHaveBeenCalled()
})

it('offers no new attempt for a refused presentation', async () => {
  const { ApiError } = jest.requireMock('@/api/client') as typeof import('@/api/transport')
  redemptions.previewRedemption.mockRejectedValue(new ApiError(403, null))
  const view = await page()
  expect(await view.findByText('Sua conta não pode validar este benefício.')).toBeOnTheScreen()
  expect(view.queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
})

// A benefit of another establishment (404) is refused at the confirmation too:
// repeating it could never succeed, so it is not offered as a safe retry.
it('treats a 404 at confirmation as a refusal, not as an ambiguous answer', async () => {
  const { ApiError } = jest.requireMock('@/api/client') as typeof import('@/api/transport')
  redemptions.previewRedemption.mockResolvedValue(previewOf())
  redemptions.confirmRedemption.mockRejectedValue(new ApiError(404, null))
  const view = await page()
  await fireEvent.press(await view.findByRole('button', { name: 'Confirmar utilização' }))
  expect(
    await view.findByText('Este código não vale mais. Peça ao cliente para gerar um novo.')
  ).toBeOnTheScreen()
  expect(view.queryByText(/Tentar de novo é seguro/)).toBeNull()
  expect(view.queryByRole('button', { name: 'Confirmar utilização' })).toBeNull()
})

// The history may have been read before this use; it is refetched, the receipt never cached.
it('refreshes the partner history once a use is confirmed', async () => {
  redemptions.previewRedemption.mockResolvedValue(previewOf())
  redemptions.confirmRedemption.mockResolvedValue({
    receipt_code: 'EXP-1234',
    holder: { full_name: 'Ana Souza' },
    establishment: { name: 'Café' },
    offer: { title: 'Item em dobro', terms: null },
    edition: { name: 'Pacote Londrina' },
    redemption_number: 1,
    redeemed_at: '2026-09-26T12:00:00Z',
  })
  const view = await page()
  const invalidate = jest.spyOn(client, 'invalidateQueries')
  await fireEvent.press(await view.findByRole('button', { name: 'Confirmar utilização' }))
  await view.findByText('EXP-1234')
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['partner', 'redemptions'] })
  expect(client.getQueryCache().getAll()).toHaveLength(0)
})
