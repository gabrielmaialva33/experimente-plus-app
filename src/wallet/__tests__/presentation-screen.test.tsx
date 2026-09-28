import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react-native'

import PresentScreen from '@/app/carteira/apresentar'
import { PRESENTATION_AWAKE_TAG } from '../keep-awake'
import type { Presentation, Wallet, WalletBenefit } from '../types'

const mockPush = jest.fn()
const mockFocus = { current: true }

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ accessId: '1', offerId: '2' }),
  useIsFocused: () => mockFocus.current,
}))
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}))
jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').View }))
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(async () => ({ type: 'opened' })),
}))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('@/api/client', () => ({ ApiError: jest.requireActual('@/api/transport').ApiError }))
jest.mock('@/session/context', () => ({
  useSession: () => ({
    status: 'authenticated',
    context: { user: { id: 1 }, active_operation: { id: 1 } },
  }),
  usePartnerAreas: () => ({ canValidate: false, canReadHistory: false }),
}))
jest.mock('@/api/wallet', () => ({ getWallet: jest.fn(), createPresentation: jest.fn() }))

const api = jest.requireMock('@/api/wallet') as {
  getWallet: jest.Mock
  createPresentation: jest.Mock
}
const keepAwake = jest.requireMock('expo-keep-awake') as {
  activateKeepAwakeAsync: jest.Mock
  deactivateKeepAwake: jest.Mock
}

const CODE = 'Código temporário do benefício'

const benefit: WalletBenefit = {
  key: '1:2',
  access_id: 1,
  offer_id: 2,
  availability: 'available',
  title: 'Sobremesa em dobro',
  description: '',
  benefit_type: 'buy_one_get_one',
  terms: null,
  reservation_required: false,
  on_premise_only: true,
  minimum_party_size: 1,
  max_redemptions_per_access: 1,
  redemption_count: 0,
  remaining_redemptions: 1,
  latest_redemption: null,
  establishment: { id: 1, public_name: 'Café da Praça', slug: 'cafe' },
}

const walletWith = (changes: Partial<WalletBenefit> = {}): Wallet => ({
  summary: { passes: 1, benefits: 1, available: 1, upcoming: 0, redeemed: 0 },
  passes: [
    {
      access: {
        id: 1,
        status: 'active',
        availability: 'available',
        source: 'payment',
        granted_at: '',
        offer_id: null,
        product_type: 'edition',
        usage_starts_at: '',
        usage_ends_at: '',
      },
      edition: {
        id: 1,
        name: 'Edição',
        slug: 'edicao',
        description: null,
        usage_starts_at: '',
        usage_ends_at: '',
        city: {
          id: 1,
          name: 'Londrina',
          slug: 'londrina',
          state_code: 'PR',
          timezone: 'America/Sao_Paulo',
        },
      },
      benefits: [{ ...benefit, ...changes }],
    },
  ],
})

const presentation = (seconds = 300): Presentation => ({
  token: 'token',
  qr_data_url: 'data:image/png;base64,QR',
  validation_url: 'https://example.com/validate',
  issued_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + seconds * 1000).toISOString(),
  expires_in_seconds: seconds,
  benefit: {
    access_id: 1,
    offer_id: 2,
    edition_name: 'Edição',
    establishment_name: 'Café da Praça',
    offer_title: 'Sobremesa em dobro',
    offer_description: '',
    terms: null,
    reservation_required: false,
    on_premise_only: true,
    minimum_party_size: 1,
    remaining_redemptions: 1,
  },
})

async function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  const view = await render(
    <QueryClientProvider client={client}>
      <PresentScreen />
    </QueryClientProvider>
  )
  /** The next read of the wallet, as the screen's poll would bring it. */
  const poll = (wallet: Wallet) =>
    act(async () => {
      api.getWallet.mockResolvedValue(wallet)
      await client.invalidateQueries({ queryKey: ['wallet'] })
    })
  return { view, client, poll }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFocus.current = true
  api.getWallet.mockResolvedValue(walletWith())
  api.createPresentation.mockImplementation(async () => presentation())
})
afterEach(() => jest.useRealTimers())

describe('keeping the screen awake', () => {
  it('holds it only once the code is on screen, never while it is being generated', async () => {
    let finish!: (value: Presentation) => void
    api.createPresentation.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const { view, client } = await mount()
    expect(await view.findByRole('progressbar', { name: 'Gerando apresentação' })).toBeTruthy()
    expect(keepAwake.activateKeepAwakeAsync).not.toHaveBeenCalled()

    await act(async () => finish(presentation()))
    expect(await view.findByLabelText(CODE)).toBeOnTheScreen()
    expect(keepAwake.activateKeepAwakeAsync).toHaveBeenCalledTimes(1)
    expect(keepAwake.activateKeepAwakeAsync).toHaveBeenCalledWith(PRESENTATION_AWAKE_TAG)
    expect(keepAwake.deactivateKeepAwake).not.toHaveBeenCalled()

    await view.unmount()
    expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledTimes(1)
    expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledWith(PRESENTATION_AWAKE_TAG)
    client.clear()
  })

  it('lets go when the code expires', async () => {
    jest.useFakeTimers()
    api.createPresentation.mockImplementation(async () => presentation(2))
    const { view, client } = await mount()
    await view.findByLabelText(CODE)
    expect(keepAwake.activateKeepAwakeAsync).toHaveBeenCalledTimes(1)

    await act(async () => {
      await jest.advanceTimersByTimeAsync(2100)
    })
    expect(view.getByText('Expirado')).toBeOnTheScreen()
    expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledTimes(1)
    await view.unmount()
    // Already let go: the unmount has nothing more to release.
    expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledTimes(1)
    client.clear()
  })

  it('lets go when the screen loses focus, and holds again when it comes back', async () => {
    jest.useFakeTimers()
    const { view, client } = await mount()
    await view.findByLabelText(CODE)
    mockFocus.current = false
    // A second passes, and the countdown draws the code again, now out of focus.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000)
    })
    expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledTimes(1)

    mockFocus.current = true
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000)
    })
    expect(keepAwake.activateKeepAwakeAsync).toHaveBeenCalledTimes(2)
    await view.unmount()
    client.clear()
  })

  it('lets go when a fresh wallet takes the code away', async () => {
    const { view, client, poll } = await mount()
    await view.findByLabelText(CODE)
    await poll(walletWith({ availability: 'paused' }))
    expect(await view.findByText(/Não é possível apresentar este benefício agora/)).toBeTruthy()
    expect(view.queryByLabelText(CODE)).toBeNull()
    expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledTimes(1)
    await view.unmount()
    client.clear()
  })
})
