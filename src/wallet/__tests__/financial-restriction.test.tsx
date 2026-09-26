import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native'

import { palette } from '@/theme/tokens'
import { ApiError } from '@/api/client'
import WalletScreen from '@/app/(tabs)/wallet'
import PresentScreen from '@/app/carteira/apresentar'
import ConfirmScreen from '@/app/validar/confirmar'
import { canPresentBenefit, FINANCIAL_RESTRICTION_MESSAGE, presentationEligibility } from '../financial-restriction'
import type { Wallet, WalletBenefit } from '../types'

const mockPush = jest.fn()

jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({ accessId: '1', offerId: '2', token: 'private-test-token' }),
  useFocusEffect: jest.fn(),
}))
jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').View }))
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))
jest.mock('@/api/client', () => ({ ApiError: class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, body: unknown) {
    super('Request refused')
    this.status = status
    this.body = body
  }
} }))
jest.mock('@/session/context', () => ({ useSession: () => ({ status: 'authenticated', context: { user: { id: 1 } } }) }))
jest.mock('@/api/wallet', () => ({ getWallet: jest.fn(), createPresentation: jest.fn() }))
jest.mock('@/api/redemptions', () => ({ previewRedemption: jest.fn(), confirmRedemption: jest.fn() }))
jest.mock('@/api/purchases', () => ({ listPurchases: jest.fn(() => Promise.resolve({ purchases: [] })) }))

const api = jest.requireMock('@/api/wallet') as { getWallet: jest.Mock; createPresentation: jest.Mock }
const redemptions = jest.requireMock('@/api/redemptions') as { previewRedemption: jest.Mock; confirmRedemption: jest.Mock }

const benefit: WalletBenefit = {
  key: '1:2', access_id: 1, offer_id: 2, availability: 'available', title: 'Benefício', description: 'Condições',
  benefit_type: 'discount', terms: null, reservation_required: false, on_premise_only: true,
  minimum_party_size: 1, max_redemptions_per_access: 1, remaining_redemptions: 1,
  establishment: { id: 1, public_name: 'Café', slug: 'cafe' },
}

const wallet: Wallet = {
  summary: { passes: 1, benefits: 1, available: 1, upcoming: 0, redeemed: 0 },
  passes: [{
    access: { offer_id: null, product_type: 'edition', usage_starts_at: '2026-10-01T00:00:00Z', usage_ends_at: '2026-12-31T00:00:00Z', id: 1, source: 'payment', status: 'active', availability: 'available', granted_at: '' },
    edition: { id: 1, name: 'Edição', slug: 'edicao', description: null, usage_starts_at: '', usage_ends_at: '',
      city: { id: 1, name: 'Londrina', slug: 'londrina', state_code: 'PR', timezone: 'America/Sao_Paulo' } },
    benefits: [benefit],
  }],
}

const blockedWallet: Wallet = {
  ...wallet, passes: [{ ...wallet.passes[0], access: { ...wallet.passes[0].access, financially_blocked: true, availability: 'paused' },
    benefits: [{ ...benefit, availability: 'paused' }],
  }],
}

function page(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette.light)
  api.getWallet.mockResolvedValue(blockedWallet)
})

it('uses the access financial flag with the canonical paused availability', () => {
  expect(canPresentBenefit(wallet.passes[0], benefit)).toBe(true)
  expect(canPresentBenefit(blockedWallet.passes[0], blockedWallet.passes[0].benefits[0])).toBe(false)
  expect(presentationEligibility(blockedWallet, 1, 2)).toEqual({ blocked: true, allowed: false })
  expect(presentationEligibility(wallet, 1, 2)).toEqual({ blocked: false, allowed: true })
  expect(canPresentBenefit({ ...wallet.passes[0], access: { ...wallet.passes[0].access, financially_blocked: true } }, benefit)).toBe(false)
  expect(canPresentBenefit(wallet.passes[0], { ...benefit, availability: 'paused' })).toBe(false)
  expect(presentationEligibility(wallet, 404, 2).allowed).toBe(false)
  expect(presentationEligibility(wallet, 1, 404).allowed).toBe(false)
})

it('removing a hold preserves server availability and does not restore consumed uses', () => {
  expect(canPresentBenefit(wallet.passes[0], { ...benefit, availability: 'redeemed' })).toBe(false)
  expect(canPresentBenefit({ ...wallet.passes[0], access: { ...wallet.passes[0].access, availability: 'upcoming' } }, benefit)).toBe(false)
})

it('explains the blocked wallet without offering a presentation or financial details', async () => {
  const view = await page(<WalletScreen />)
  await waitFor(() => expect(view.getAllByText(FINANCIAL_RESTRICTION_MESSAGE).length).toBeGreaterThan(0))
  expect(view.getByRole('button', { name: /^Apresentar/ })).toBeDisabled()
  expect(view.queryByText(/disputa|reembolso|cartão/i)).toBeNull()
})

it('a direct presentation route rechecks the wallet and does not POST for a blocked access', async () => {
  const view = await page(<PresentScreen />)
  expect(await view.findByText(FINANCIAL_RESTRICTION_MESSAGE)).toBeOnTheScreen()
  expect(api.getWallet).toHaveBeenCalled()
  expect(api.createPresentation).not.toHaveBeenCalled()
  expect(view.queryByRole('button', { name: /Gerar/ })).toBeNull()
})

it('does not create a presentation when the fresh wallet cannot be read', async () => {
  api.getWallet.mockRejectedValue(new Error('offline'))
  const view = await page(<PresentScreen />)
  expect(await view.findByText(/Não é possível apresentar/)).toBeOnTheScreen()
  expect(api.createPresentation).not.toHaveBeenCalled()
})

it('removes an already displayed code when a fresh wallet reports a hold', async () => {
  api.getWallet.mockResolvedValue(wallet)
  api.createPresentation.mockResolvedValue({
    expires_at: new Date(Date.now() + 300_000).toISOString(),
    qr_data_url: 'data:image/png;base64,test',
    benefit: { offer_title: 'Benefício', establishment_name: 'Café', terms: null },
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } })
  const view = await render(<QueryClientProvider client={client}><PresentScreen /></QueryClientProvider>)
  expect(await view.findByLabelText('Código temporário do benefício')).toBeOnTheScreen()
  api.getWallet.mockResolvedValue(blockedWallet)
  await act(async () => { await client.invalidateQueries({ queryKey: ['wallet'] }) })
  expect(await view.findByText(FINANCIAL_RESTRICTION_MESSAGE)).toBeOnTheScreen()
  expect(view.queryByLabelText('Código temporário do benefício')).toBeNull()
  expect(view.queryByRole('button', { name: 'Gerar outro código' })).toBeNull()
  expect(api.createPresentation).toHaveBeenCalledTimes(1)
})

it('a partner preview refused by the server has no confirmation action or financial detail', async () => {
  redemptions.previewRedemption.mockRejectedValue(new ApiError(400, { message: 'private financial detail' }))
  const view = await page(<ConfirmScreen />)
  expect(await view.findByText('Não foi possível validar esta apresentação. Peça ao cliente para consultar a carteira e gerar um novo código, se o benefício estiver disponível.')).toBeOnTheScreen()
  expect(view.queryByText(/private financial detail/)).toBeNull()
  expect(view.queryByRole('button', { name: 'Confirmar utilização' })).toBeNull()
  expect(redemptions.confirmRedemption).not.toHaveBeenCalled()
})

// Direction A draws each benefit as a ticket: a card on the subtle border with a
// chrome stub naming the benefit; a hold stays a neutral note, never an alarm.
it.each(['light', 'dark'] as const)('draws benefits as bounded tickets with a localized neutral blocked state in %s', async (mode) => {
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette[mode])
  api.getWallet.mockResolvedValue(wallet)
  const available = await page(<WalletScreen />)
  expect(await available.findByTestId('wallet-benefit-1:2')).toHaveStyle({ backgroundColor: palette[mode].card, borderColor: palette[mode].borderSubtle, borderWidth: 1 })
  expect(available.getByText('Benefício').parent).toHaveStyle({ backgroundColor: palette[mode].chrome })
  expect(available.getByText('Benefício')).toHaveStyle({ color: palette[mode].chromeForeground })
  await available.unmount()
  api.getWallet.mockResolvedValue(blockedWallet)
  const blocked = await page(<WalletScreen />)
  expect(await blocked.findByTestId('wallet-benefit-1:2')).toHaveStyle({ backgroundColor: palette[mode].card })
  expect(blocked.getAllByText(FINANCIAL_RESTRICTION_MESSAGE).at(-1)).toHaveStyle({ backgroundColor: palette[mode].statusNeutral, color: palette[mode].statusNeutralForeground })
  expect(blocked.getByRole('button', { name: /^Apresentar/ })).toBeDisabled()
})

// The catalog and past uses are whole cards (support plane and subtle border);
// CTA orange stays reserved for presenting a benefit.
it.each(['light', 'dark'] as const)('leads to the catalog and past uses from cards and reserves CTA for presenting in %s', async (mode) => {
  jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette[mode])
  api.getWallet.mockResolvedValue(wallet)
  const view = await page(<WalletScreen />)
  const catalog = await view.findByRole('button', { name: /^Ver benefícios disponíveis/ })
  const history = view.getByRole('button', { name: 'Meus usos' })
  expect(catalog).toHaveStyle({ backgroundColor: palette[mode].primarySoft, minHeight: 64 })
  expect(history).toHaveStyle({ backgroundColor: palette[mode].card, borderColor: palette[mode].borderSubtle, minHeight: 64 })
  expect(view.getByText('Ver benefícios disponíveis')).toHaveStyle({ color: palette[mode].primaryAccent })
  expect(view.getByRole('button', { name: 'Apresentar Benefício em Café' })).toHaveStyle({ backgroundColor: palette[mode].cta })
  expect(view.getByText('Apresentar')).toHaveStyle({ color: palette[mode].ctaForeground })
  expect(view.getByText('1 uso restante')).toHaveStyle({ color: palette[mode].ctaAccent })
})

it('distinguishes a multi-offer package from one store voucher and uses the effective access window', async () => {
  const storeBenefit = { ...benefit, key: '2:3', access_id: 2, offer_id: 3, title: 'Voucher do Bistrô', establishment: { id: 2, public_name: 'Bistrô', slug: 'bistro' } }
  api.getWallet.mockResolvedValue({ ...wallet, passes: [
    { ...wallet.passes[0], benefits: [benefit, { ...storeBenefit, key: '1:3', access_id: 1 }] },
    { ...wallet.passes[0], access: { ...wallet.passes[0].access, id: 2, product_type: 'offer', offer_id: 3,
      usage_starts_at: '2026-11-01T00:00:00Z', usage_ends_at: '2026-11-30T00:00:00Z' }, benefits: [storeBenefit] },
  ] })
  const view = await page(<WalletScreen />)
  const pack = within(await view.findByTestId('wallet-pass-1'))
  const voucher = within(view.getByTestId('wallet-pass-2'))
  expect(pack.getByText('Pacote da cidade')).toBeOnTheScreen()
  expect(pack.getAllByRole('button', { name: /^Apresentar/ })).toHaveLength(2)
  expect(voucher.getByText('Voucher avulso')).toBeOnTheScreen()
  expect(voucher.getAllByText('Bistrô').length).toBeGreaterThan(0)
  expect(voucher.queryByText('Café')).toBeNull()
  expect(voucher.getAllByRole('button', { name: /^Apresentar/ })).toHaveLength(1)
  // The access windows are instants at midnight UTC, read on Londrina's clock.
  expect(voucher.getByText('Válido até 29/11/2026')).toBeOnTheScreen()
  expect(pack.getAllByText('Válido até 30/12/2026')).toHaveLength(2)
  expect(view.queryByText(/UTC/)).toBeNull()
})

it('uses the server product type rather than counting remaining benefits and preserves voucher financial blocking', async () => {
  api.getWallet.mockResolvedValue({ ...wallet, passes: [wallet.passes[0], {
    ...blockedWallet.passes[0], access: { ...blockedWallet.passes[0].access, id: 2, product_type: 'offer', offer_id: 2 },
  }] })
  const view = await page(<WalletScreen />)
  expect(within(await view.findByTestId('wallet-pass-1')).getByText('Pacote da cidade')).toBeOnTheScreen()
  const voucher = within(view.getByTestId('wallet-pass-2'))
  expect(voucher.getByText('Voucher avulso')).toBeOnTheScreen()
  expect(voucher.getAllByText(FINANCIAL_RESTRICTION_MESSAGE).length).toBeGreaterThan(0)
  expect(voucher.getByRole('button', { name: /^Apresentar/ })).toBeDisabled()
})


it.each([
  ['upcoming', 'Ainda não começou'], ['outside_schedule', 'Fora do horário'],
  ['paused', 'Pausado'], ['expired', 'Expirado'], ['revoked', 'Revogado'], ['redeemed', 'Já utilizado'],
] as const)('shows server availability %s and disables use for both access and benefit restrictions', async (availability, label) => {
  for (const target of ['access', 'benefit']) {
    api.getWallet.mockResolvedValue({ ...wallet, passes: [{ ...wallet.passes[0],
      access: { ...wallet.passes[0].access, ...(target === 'access' ? { availability } : {}) },
      benefits: [{ ...benefit, ...(target === 'benefit' ? { availability } : {}) }],
    }] })
    const view = await page(<WalletScreen />)
    expect(await view.findByText(label)).toBeOnTheScreen()
    expect(view.queryByText('Disponível')).toBeNull()
    const action = view.getByRole('button', { name: /^Apresentar/ })
    expect(action).toBeDisabled()
    await fireEvent.press(action)
    expect(mockPush).not.toHaveBeenCalled()
    await view.unmount()
  }
})

it('explains a revoked access even if availability still reads available', async () => {
  api.getWallet.mockResolvedValue({ ...wallet, passes: [{ ...wallet.passes[0],
    access: { ...wallet.passes[0].access, status: 'revoked' },
  }] })
  const view = await page(<WalletScreen />)
  expect(await view.findByText('Revogado')).toBeOnTheScreen()
  expect(view.getByRole('button', { name: /^Apresentar/ })).toBeDisabled()
})

it.each([
  ['wallet', 'Carregando carteira'], ['presentation', 'Gerando apresentação'], ['preview', 'Carregando apresentação'],
])('shows an initial skeleton for %s without an actionable benefit', async (kind, label) => {
  api.getWallet.mockReturnValue(new Promise(() => {}))
  redemptions.previewRedemption.mockReturnValue(new Promise(() => {}))
  const view = await page(kind === 'wallet' ? <WalletScreen /> : kind === 'presentation' ? <PresentScreen /> : <ConfirmScreen />)
  expect((await view.findByRole('progressbar', { name: label })).props.accessibilityState).toEqual({ busy: true })
  expect(view.queryByRole('button', { name: /Apresentar|Confirmar utilização|Gerar outro/ })).toBeNull()
  expect(view.queryByLabelText('Código temporário do benefício')).toBeNull()
})


it.each([400, 422])('asks for a new presentation after an invalid/expired token response (%s), including during confirmation', async (status) => {
  const message = status === 400
    ? 'Não foi possível validar esta apresentação. Peça ao cliente para consultar a carteira e gerar um novo código, se o benefício estiver disponível.'
    : 'Este código não vale mais. Peça ao cliente para gerar um novo.'
  redemptions.previewRedemption.mockRejectedValueOnce(new ApiError(status, { message: 'private rejection detail' }))
  const previewView = await page(<ConfirmScreen />)
  expect(await previewView.findByText(message)).toBeOnTheScreen()
  expect(previewView.queryByRole('button', { name: 'Confirmar utilização' })).toBeNull()
  await previewView.unmount()
  redemptions.previewRedemption.mockResolvedValue({
    token: 'private-test-token', holder: { full_name: 'Cliente' },
    benefit: { establishment_name: 'Café', offer_title: 'Benefício', edition_name: 'Edição', remaining_redemptions: 1 },
  })
  redemptions.confirmRedemption.mockRejectedValueOnce(new ApiError(status, { message: 'private rejection detail' }))
  const confirmView = await page(<ConfirmScreen />)
  await fireEvent.press(await confirmView.findByRole('button', { name: 'Confirmar utilização' }))
  expect(await confirmView.findByText(message)).toBeOnTheScreen()
  expect(confirmView.queryByRole('button', { name: 'Confirmar utilização' })).toBeNull()
  expect(confirmView.queryByText('private rejection detail')).toBeNull()
  expect(redemptions.confirmRedemption).toHaveBeenCalledTimes(1)
})
