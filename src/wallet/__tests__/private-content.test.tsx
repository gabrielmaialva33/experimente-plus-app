import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import PresentScreen from '@/app/carteira/apresentar'
import ConfirmScreen from '@/app/validar/confirmar'
import { SessionProvider, useSession } from '@/session/context'
import { clearCredentials, writeCredentials } from '@/api/session'
import { notifySessionEvent } from '@/api/session-events'
import type { Presentation, Preview, Receipt, Wallet } from '../types'

const mockStore = new Map<string, string>()
const mockParams: Record<string, string | undefined> = { accessId: '1', offerId: '2' }
const mockRouter = { back: jest.fn(), setParams: jest.fn((params) => Object.assign(mockParams, params)) }
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ ...mockParams }), useRouter: () => mockRouter }))
jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').View }))
jest.mock('@/theme/use-colors', () => ({ useColors: () => require('@/theme/tokens').palette.light }))
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: async (key: string) => mockStore.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { mockStore.set(key, value) },
  deleteItemAsync: async (key: string) => { mockStore.delete(key) },
}))
jest.mock('react-native-mmkv', () => ({ createMMKV: () => ({ getBoolean: () => true }) }))
jest.mock('@/api/me', () => ({ getContext: jest.fn(async () => ({ user: { id: 1 }, active_operation: { id: 1 }, capabilities: {} })) }))
jest.mock('@/api/wallet', () => ({ getWallet: jest.fn(), createPresentation: jest.fn() }))
jest.mock('@/api/redemptions', () => ({ previewRedemption: jest.fn(), confirmRedemption: jest.fn() }))

const api = jest.requireMock('@/api/wallet') as { getWallet: jest.Mock; createPresentation: jest.Mock }
const redemption = jest.requireMock('@/api/redemptions') as { previewRedemption: jest.Mock; confirmRedemption: jest.Mock }
const token = 'private-presentation-token'
const qr = 'data:image/png;base64,PRIVATE_QR'
const validationUrl = `https://example.com/validate?token=${token}`
const benefit = { access_id: 1, offer_id: 2, offer_title: 'Benefício', offer_description: '', on_premise_only: true, establishment_name: 'Café', edition_name: 'Edição',
  terms: null, reservation_required: false, minimum_party_size: 1, remaining_redemptions: 1 }
const presentation = (): Presentation => ({ token, qr_data_url: qr, validation_url: validationUrl,
  issued_at: new Date().toISOString(), expires_at: new Date(Date.now() + 2000).toISOString(), expires_in_seconds: 300,
  benefit })
const preview: Preview = { token, expires_at: new Date(Date.now() + 300_000).toISOString(),
  holder: { id: 1, full_name: 'Titular privado', email: 'private@example.test' }, benefit }
const receipt: Receipt = { id: 1, receipt_code: 'ORIGINAL', redemption_number: 1, redeemed_at: '',
  edition: { id: 1, name: 'Edição' }, offer: { id: 2, title: 'Benefício', benefit_type: 'discount', terms: null },
  establishment: { id: 1, name: 'Café' }, holder: preview.holder, redeemed_by: 2 }
const wallet: Wallet = {
  summary: { passes: 1, benefits: 1, available: 1, upcoming: 0, redeemed: 0 },
  passes: [{
    access: { id: 1, status: 'active', availability: 'available', source: 'payment', granted_at: '',
      offer_id: null, product_type: 'edition', usage_starts_at: '', usage_ends_at: '' },
    edition: { id: 1, name: 'Edição', slug: 'edicao', description: null, usage_starts_at: '', usage_ends_at: '',
      city: { id: 1, name: 'Londrina', slug: 'londrina', state_code: 'PR', timezone: 'America/Sao_Paulo' } },
    benefits: [{ key: '1:2', access_id: 1, offer_id: 2, availability: 'available', title: 'Benefício', description: '',
      benefit_type: 'discount', terms: null, reservation_required: false, on_premise_only: true, minimum_party_size: 1,
      max_redemptions_per_access: 1, remaining_redemptions: 1, establishment: { id: 1, public_name: 'Café', slug: 'cafe' } }],
  }],
}

function Logout() {
  const { signOut, refresh } = useSession()
  return <><Text onPress={() => { void signOut() }}>Logout</Text><Text onPress={() => { void refresh() }}>Refresh session</Text></>
}
async function mount(node: React.ReactNode) {
  // Long retention exposes accidental writes; no gcTime:0 can mask a leak.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } })
  const view = await render(<QueryClientProvider client={client}><SessionProvider>{node}<Logout /></SessionProvider></QueryClientProvider>)
  return { view, client }
}
function expectNoPrivateCache(client: QueryClient) {
  expect(client.getMutationCache().getAll()).toHaveLength(0)
  for (const query of client.getQueryCache().getAll()) {
    expect(query.queryKey[0]).toBe('wallet')
    const contents = JSON.stringify([query.queryKey, query.state])
    for (const value of [token, qr, validationUrl, preview.holder.email]) expect(contents).not.toContain(value)
  }
}

beforeEach(async () => {
  jest.clearAllMocks()
  for (const fn of [...Object.values(api), ...Object.values(redemption)]) fn.mockReset()
  jest.requireMock('@/api/me').getContext.mockResolvedValue({ user: { id: 1 }, active_operation: { id: 1 }, capabilities: {} })
  mockParams.accessId = '1'; mockParams.offerId = '2'; mockParams.token = token
  await clearCredentials()
  await writeCredentials({ accessToken: 'access-test', refreshToken: 'refresh-test', accessExpiresAt: Date.now() + 900_000 })
  api.getWallet.mockResolvedValue(wallet)
  api.createPresentation.mockImplementation(async () => presentation())
  redemption.previewRedemption.mockResolvedValue(preview)
  redemption.confirmRedemption.mockResolvedValue(receipt)
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
})
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers() })

it('keeps the displayed QR out of query/mutation and image caches, including after unmount', async () => {
  const { view, client } = await mount(<PresentScreen />)
  const image = await view.findByLabelText('Código temporário do benefício')
  expect(image.props.cachePolicy).toBe('none')
  expectNoPrivateCache(client)
  await view.unmount()
  expectNoPrivateCache(client)
  client.clear()
})

it('keeps preview and confirmation out of caches and retries the SAME token after an ambiguous failure', async () => {
  redemption.confirmRedemption.mockRejectedValueOnce(new TypeError('timeout')).mockResolvedValueOnce(receipt)
  const { view, client } = await mount(<ConfirmScreen />)
  await view.findByText('Titular privado')
  expect(redemption.confirmRedemption).not.toHaveBeenCalled()
  expect(mockParams.token).toBeUndefined()
  expectNoPrivateCache(client)
  await fireEvent.press(view.getByRole('button', { name: 'Confirmar utilização' }))
  await view.findByText(/A confirmação não completou/)
  expectNoPrivateCache(client)
  await fireEvent.press(view.getByRole('button', { name: 'Confirmar utilização' }))
  await view.findByText('ORIGINAL')
  expect(redemption.confirmRedemption.mock.calls.map(([value]) => value)).toEqual([token, token])
  expectNoPrivateCache(client)
  await view.unmount()
  expectNoPrivateCache(client)
  client.clear()
})

it.each(['presentation', 'preview'])('discards %s on real logout even while the screen remains mounted', async (kind) => {
  const { view, client } = await mount(kind === 'presentation' ? <PresentScreen /> : <ConfirmScreen />)
  if (kind === 'presentation') await view.findByLabelText('Código temporário do benefício')
  else await view.findByText('Titular privado')
  await fireEvent.press(view.getByText('Logout'))
  await waitFor(() => {
    expect(view.queryByLabelText('Código temporário do benefício')).toBeNull()
    expect(view.queryByText('Titular privado')).toBeNull()
    expect(view.queryByRole('button', { name: 'Confirmar utilização' })).toBeNull()
  })
  expectNoPrivateCache(client)
  await act(async () => notifySessionEvent('operation-settled'))
  expectNoPrivateCache(client)
  expect(view.queryByLabelText('Código temporário do benefício')).toBeNull()
  await view.unmount()
  client.clear()
})

it.each(['unmount', 'logout', 'switch'])('ignores a delayed presentation response after %s', async (exit) => {
  let finish!: (value: Presentation) => void
  api.createPresentation.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
  const { view, client } = await mount(<PresentScreen />)
  await waitFor(() => expect(api.createPresentation).toHaveBeenCalledTimes(1))
  if (exit === 'unmount') await view.unmount()
  else if (exit === 'logout') await fireEvent.press(view.getByText('Logout'))
  else await act(async () => notifySessionEvent('operation-changing'))
  expect((api.createPresentation.mock.calls[0][2] as AbortSignal).aborted).toBe(true)
  await act(async () => finish(presentation()))
  expectNoPrivateCache(client)
  if (exit !== 'unmount') {
    expect(view.queryByLabelText('Código temporário do benefício')).toBeNull()
    await view.unmount()
  }
  client.clear()
})

it('uses expires_at, expires without extension, and requests a NEW presentation explicitly', async () => {
  jest.useFakeTimers()
  const { view, client } = await mount(<PresentScreen />)
  await view.findByLabelText('Código temporário do benefício')
  expect(view.getByText('Válido por 0:02')).toBeTruthy()
  await act(async () => { await jest.advanceTimersByTimeAsync(2100) })
  expect(view.getByText('Expirado')).toBeTruthy()
  expect(view.queryByLabelText('Código temporário do benefício')).toBeNull()
  expect(api.createPresentation).toHaveBeenCalledTimes(1)
  api.createPresentation.mockImplementation(async () => ({ ...presentation(), token: 'new-token', qr_data_url: 'new-qr' }))
  await fireEvent.press(view.getByRole('button', { name: 'Gerar novo código' }))
  await waitFor(() => expect(view.getByLabelText('Código temporário do benefício').props.source.uri).toBe('new-qr'))
  expect(api.createPresentation).toHaveBeenCalledTimes(2)
  expectNoPrivateCache(client)
  await view.unmount()
  client.clear()
})


it.each(['focus', 'reconnect'])('repeats preview with the same token on %s, retaining the current preview until the response', async (trigger) => {
  const { view, client } = await mount(<ConfirmScreen />)
  await view.findByText('Titular privado')
  let finish!: (value: Preview) => void
  redemption.previewRedemption.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  await act(async () => {
    if (trigger === 'focus') { focusManager.setFocused(false); focusManager.setFocused(true) }
    else { onlineManager.setOnline(false); onlineManager.setOnline(true) }
  })
  const calls = redemption.previewRedemption.mock.calls.map(([value]) => value)
  const visibleWhileLoading = view.queryByText('Titular privado')
  if (finish) await act(async () => finish(preview))
  await view.unmount()
  expect(calls).toEqual([token, token])
  expect(visibleWhileLoading).not.toBeNull()
  expect(redemption.confirmRedemption).not.toHaveBeenCalled()
  expectNoPrivateCache(client)
  client.clear()
})

it.each(['preview', 'confirmation'])('aborts pending %s on logout and ignores its eventual result', async (kind) => {
  let finish!: (value: Preview | Receipt) => void
  if (kind === 'preview') redemption.previewRedemption.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  else redemption.confirmRedemption.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  const { view, client } = await mount(<ConfirmScreen />)
  if (kind === 'confirmation') {
    await view.findByText('Titular privado')
    await fireEvent.press(view.getByRole('button', { name: 'Confirmar utilização' }))
  }
  const fn = kind === 'preview' ? redemption.previewRedemption : redemption.confirmRedemption
  await waitFor(() => expect(fn).toHaveBeenCalledTimes(1))
  const signal = fn.mock.calls[0][1] as AbortSignal
  await fireEvent.press(view.getByText('Logout'))
  expect(signal.aborted).toBe(true)
  await act(async () => finish(kind === 'preview' ? preview : receipt))
  expect(view.queryByText('Titular privado')).toBeNull()
  expect(view.queryByText('ORIGINAL')).toBeNull()
  expect(mockParams.token).toBeUndefined()
  expectNoPrivateCache(client)
  await view.unmount()
  client.clear()
})

it('keeps same-token confirmation retry when an older preview fails after an ambiguous confirmation', async () => {
  const { ApiError } = require('@/api/client') as typeof import('@/api/client')
  const { view, client } = await mount(<ConfirmScreen />)
  await view.findByText('Titular privado')
  let rejectPreview!: (error: unknown) => void
  redemption.previewRedemption.mockImplementationOnce(() => new Promise((_, reject) => { rejectPreview = reject }))
  await act(async () => { focusManager.setFocused(false); focusManager.setFocused(true) })
  redemption.confirmRedemption.mockRejectedValueOnce(new TypeError('timeout')).mockResolvedValueOnce(receipt)
  await fireEvent.press(view.getByRole('button', { name: 'Confirmar utilização' }))
  await view.findByText(/A confirmação não completou/)
  await act(async () => rejectPreview(new ApiError(422, null)))
  await fireEvent.press(view.getByRole('button', { name: 'Confirmar utilização' }))
  await view.findByText('ORIGINAL')
  expect(redemption.confirmRedemption.mock.calls.map(([value]) => value)).toEqual([token, token])
  expect((redemption.previewRedemption.mock.calls[1][1] as AbortSignal).aborted).toBe(true)
  expectNoPrivateCache(client)
  await view.unmount()
  client.clear()
})


it('cannot revive the previous token after logout and a new authenticated session', async () => {
  const { view, client } = await mount(<ConfirmScreen />)
  await view.findByText('Titular privado')
  await fireEvent.press(view.getByText('Logout'))
  await waitFor(() => expect(view.queryByText('Titular privado')).toBeNull())
  await writeCredentials({ accessToken: 'new-access', refreshToken: 'new-refresh', accessExpiresAt: Date.now() + 900_000 })
  jest.requireMock('@/api/me').getContext.mockResolvedValue({ user: { id: 2 }, active_operation: { id: 2 }, capabilities: {} })
  await fireEvent.press(view.getByText('Refresh session'))
  await act(async () => { focusManager.setFocused(false); focusManager.setFocused(true) })
  expect(view.queryByText('Titular privado')).toBeNull()
  expect(view.queryByRole('button', { name: 'Confirmar utilização' })).toBeNull()
  expect(redemption.previewRedemption).toHaveBeenCalledTimes(1)
  expect(redemption.confirmRedemption).not.toHaveBeenCalled()
  expectNoPrivateCache(client)
  await view.unmount()
  expectNoPrivateCache(client)
  client.clear()
})

it('does not create a presentation if its eligibility read finishes after logout', async () => {
  let finish!: (value: Wallet) => void
  const pending = new Promise<Wallet>((resolve) => { finish = resolve })
  api.getWallet.mockReturnValue(pending)
  const { view, client } = await mount(<PresentScreen />)
  await waitFor(() => expect(api.getWallet).toHaveBeenCalled())
  await fireEvent.press(view.getByText('Logout'))
  await act(async () => finish(wallet))
  expect(api.createPresentation).not.toHaveBeenCalled()
  expectNoPrivateCache(client)
  await view.unmount()
  client.clear()
})
