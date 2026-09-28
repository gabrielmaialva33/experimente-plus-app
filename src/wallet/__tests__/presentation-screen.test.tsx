import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'

import PresentScreen from '@/app/carteira/apresentar'
import { palette } from '@/theme/tokens'
import { FINANCIAL_RESTRICTION_MESSAGE } from '../financial-restriction'
import { PRESENTATION_AWAKE_TAG } from '../keep-awake'
import type { Presentation, Wallet, WalletBenefit } from '../types'

const mockPush = jest.fn()
const mockFocus = { current: true }
const mockScheme = { current: 'light' as 'light' | 'dark' }

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
  useColors: () => jest.requireActual('@/theme/tokens').palette[mockScheme.current],
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
  mockScheme.current = 'light'
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

describe('after the partner confirms the use', () => {
  const RECEIPT = 'EXP-0123456789ABCDEF'
  const spent = walletWith({
    availability: 'redeemed',
    redemption_count: 1,
    remaining_redemptions: 0,
    // 17:32 UTC is 14:32 on Londrina's clock.
    latest_redemption: { id: '7', receipt_code: RECEIPT, redeemed_at: '2026-09-28T17:32:00Z' },
  })

  it('turns the code into a used state with the time of use and the way to its receipt', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility')
    const { view, client, poll } = await mount()
    await view.findByLabelText(CODE)

    await poll(spent)
    expect(await view.findByRole('header', { name: 'Benefício utilizado' })).toBeOnTheScreen()
    expect(view.getByText('Sobremesa em dobro · Café da Praça')).toBeOnTheScreen()
    expect(view.getByText('Usado em 28/09/2026 às 14:32')).toBeOnTheScreen()
    // A success, not the refusal it used to read as.
    expect(view.queryByText(/Não é possível apresentar/)).toBeNull()
    expect(view.queryByLabelText(CODE)).toBeNull()
    expect(view.queryByRole('button', { name: /Gerar/ })).toBeNull()
    expect(announce).toHaveBeenCalledWith('Benefício utilizado em 28/09/2026 às 14:32.')
    // The code went, and the screen may sleep again.
    expect(keepAwake.deactivateKeepAwake).toHaveBeenCalledWith(PRESENTATION_AWAKE_TAG)

    await fireEvent.press(view.getByRole('button', { name: 'Ver comprovante' }))
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/carteira/comprovante/[code]',
      params: { code: RECEIPT },
    })
    expect(api.createPresentation).toHaveBeenCalledTimes(1)
    await view.unmount()
    client.clear()
  })

  it('opens on the used state, without asking for a code, for a benefit already used', async () => {
    api.getWallet.mockResolvedValue(spent)
    const { view, client } = await mount()
    expect(await view.findByRole('header', { name: 'Benefício utilizado' })).toBeOnTheScreen()
    expect(view.getByRole('button', { name: 'Ver comprovante' })).toBeOnTheScreen()
    expect(api.createPresentation).not.toHaveBeenCalled()
    expect(keepAwake.activateKeepAwakeAsync).not.toHaveBeenCalled()
    await view.unmount()
    client.clear()
  })

  it('leads to the list of uses when the wallet does not name the receipt, without inventing a time', async () => {
    const { view, client, poll } = await mount()
    await view.findByLabelText(CODE)
    await poll(walletWith({ availability: 'redeemed', remaining_redemptions: 0 }))
    expect(await view.findByRole('header', { name: 'Benefício utilizado' })).toBeOnTheScreen()
    expect(view.queryByText(/^Usado em/)).toBeNull()
    expect(view.queryByRole('button', { name: 'Ver comprovante' })).toBeNull()
    await fireEvent.press(view.getByRole('button', { name: 'Ver histórico' }))
    expect(mockPush).toHaveBeenCalledWith('/carteira/historico')
    await view.unmount()
    client.clear()
  })

  it.each(['light', 'dark'] as const)(
    'draws the used state from the theme tokens in %s, scrollable at large text',
    async (mode) => {
      mockScheme.current = mode
      api.getWallet.mockResolvedValue(spent)
      const { view, client } = await mount()
      const title = await view.findByRole('header', { name: 'Benefício utilizado' })
      expect(title).toHaveStyle({ color: palette[mode].foreground })
      const used = view.getByTestId('presentation-used')
      expect(used).toHaveStyle({ backgroundColor: palette[mode].background })
      // Jest reports a 200% system text size: the state scrolls instead of clipping.
      expect(used.type).toBe('RCTScrollView')
      expect(view.getByRole('button', { name: 'Ver comprovante' })).toHaveStyle({
        backgroundColor: palette[mode].primary,
      })
      await view.unmount()
      client.clear()
    }
  )

  it.each([
    ['an expired benefit', walletWith({ availability: 'expired' })],
    [
      'an expired access',
      {
        ...walletWith(),
        passes: [
          {
            ...walletWith().passes[0],
            access: { ...walletWith().passes[0].access, availability: 'expired' as const },
          },
        ],
      },
    ],
  ])('keeps the refusal copy for %s', async (_reason, wallet) => {
    const { view, client, poll } = await mount()
    await view.findByLabelText(CODE)
    await poll(wallet)
    expect(await view.findByText(/Não é possível apresentar este benefício agora/)).toBeTruthy()
    expect(view.queryByText('Benefício utilizado')).toBeNull()
    await view.unmount()
    client.clear()
  })

  it('keeps the hold copy when a spent benefit is also on hold', async () => {
    const held = {
      ...spent,
      passes: [
        { ...spent.passes[0], access: { ...spent.passes[0].access, financially_blocked: true } },
      ],
    }
    const { view, client, poll } = await mount()
    await view.findByLabelText(CODE)
    await poll(held)
    expect(await view.findByText(FINANCIAL_RESTRICTION_MESSAGE)).toBeOnTheScreen()
    expect(view.queryByText('Benefício utilizado')).toBeNull()
    await view.unmount()
    client.clear()
  })
})
