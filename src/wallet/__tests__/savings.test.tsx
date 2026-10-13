import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, within } from '@testing-library/react-native'
import { Dimensions, StyleSheet } from 'react-native'

import WalletSavingsScreen from '@/app/(tabs)/wallet/economia'
import {
  recapSentence,
  savingsAmount,
  spokenMoney,
  walletUses,
  type Savings,
  type SavingsTotals,
} from '../savings'
import { SavingsBlock } from '../savings-view'
import type { Wallet } from '../types'

const mockRouter = { push: jest.fn(), navigate: jest.fn(), back: jest.fn() }

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }))
jest.mock('@/api/client', () => ({
  ApiError: jest.requireActual('@/api/transport').ApiError,
  request: jest.fn(),
}))
jest.mock('@/session/context', () => ({
  useSession: () => ({ status: 'authenticated', context: { user: { id: 1 } } }),
  usePartnerAreas: () => ({ canValidate: false, canReadHistory: false }),
}))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))

const api = jest.requireMock('@/api/client') as { request: jest.Mock }

const none: SavingsTotals = {
  places_visited: 0,
  benefits_used: 0,
  savings_exact_cents: 0,
  savings_estimated_cents: 0,
  uses_without_estimate: 0,
  top_places: [],
}

const savings = (overrides: Partial<Savings> = {}): Savings => ({
  currency: 'BRL',
  current: { ...none, editions: [] },
  past: [],
  ...overrides,
})

const edition = { id: 3, name: 'Experimente Londrina 2026', year: 2026 }

const estimated = savings({
  current: {
    ...none,
    editions: [edition],
    places_visited: 3,
    benefits_used: 4,
    savings_exact_cents: 1500,
    savings_estimated_cents: 1700,
    uses_without_estimate: 1,
    top_places: [
      { name: 'Café Aurora', visits: 2 },
      { name: 'Bistrô Ipê', visits: 1 },
    ],
  },
  past: [
    {
      ...none,
      edition: { id: 2, name: 'Experimente Londrina 2025', year: 2025 },
      places_visited: 4,
      benefits_used: 5,
      savings_exact_cents: 3000,
      savings_estimated_cents: 9000,
      top_places: [{ name: 'Mesa Norte', visits: 3 }],
    },
    {
      ...none,
      edition: { id: 1, name: 'Experimente Londrina 2024', year: 2024 },
      places_visited: 1,
      benefits_used: 2,
    },
  ],
})

/** The system text size; React Native's Jest setup reports 2 (200%). */
const setFontScale = (fontScale: number) =>
  act(() =>
    Dimensions.set({
      window: { ...Dimensions.get('window'), fontScale },
      screen: { ...Dimensions.get('screen'), fontScale },
    })
  )

const style = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>

function block(query: Partial<Parameters<typeof SavingsBlock>[0]['query']>, onOpen = jest.fn()) {
  return render(
    <SavingsBlock
      query={{ data: undefined, isError: false, refetch: jest.fn(), ...query }}
      onOpen={onOpen}
    />
  )
}

function screen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <WalletSavingsScreen />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  onlineManager.setOnline(true)
})
afterEach(() => setFontScale(2))

describe('money', () => {
  it('writes reais in pt-BR and says them as words', () => {
    expect(savingsAmount({ ...none, savings_exact_cents: 1250 })).toEqual({
      text: expect.stringMatching(/^R\$\s12,50$/),
      spoken: '12 reais e 50 centavos',
      estimated: false,
    })
    expect(
      savingsAmount({ ...none, savings_exact_cents: 100, savings_estimated_cents: 3100 })
    ).toEqual({
      text: expect.stringMatching(/^cerca de R\$\s32,00$/),
      spoken: 'cerca de 32 reais',
      estimated: true,
    })
    expect(savingsAmount(none)).toBeNull()

    expect(spokenMoney(100)).toBe('1 real')
    expect(spokenMoney(1)).toBe('1 centavo')
    expect(spokenMoney(50)).toBe('50 centavos')
    expect(spokenMoney(0)).toBe('0 reais')
    expect(spokenMoney(123456)).toBe('1.234 reais e 56 centavos')
  })

  it('recaps a year with "cerca de" only when an estimate is part of it', () => {
    const recap = recapSentence(2025, {
      ...none,
      places_visited: 4,
      savings_estimated_cents: 12000,
    })
    expect(recap.text).toMatch(
      /^Em 2025 você visitou 4 lugares e economizou cerca de R\$\s120,00\.$/
    )
    expect(recap.spoken).toBe('Em 2025 você visitou 4 lugares e economizou cerca de 120 reais.')

    const exact = recapSentence(2024, { ...none, places_visited: 1, savings_exact_cents: 1000 })
    expect(exact.text).toMatch(/^Em 2024 você visitou 1 lugar e economizou R\$\s10,00\.$/)

    const uses = recapSentence(2023, { ...none, places_visited: 1, benefits_used: 2 })
    expect(uses.text).toBe('Em 2023 você visitou 1 lugar e usou 2 benefícios.')
  })

  it('counts the uses the wallet knows of, to read the savings again after a new one', () => {
    expect(walletUses(undefined)).toBeNull()
    const wallet = {
      summary: { passes: 1, benefits: 2, available: 1, upcoming: 0, redeemed: 1 },
      passes: [
        { benefits: [{ redemption_count: 2 }, { redemption_count: 1 }, {}] },
        { benefits: [] },
      ],
    } as unknown as Wallet
    expect(walletUses(wallet)).toBe(3)
  })
})

describe('the block in the Carteira', () => {
  it('waits with a busy, labelled placeholder', async () => {
    const view = await block({})
    const loading = view.getByRole('progressbar', { name: 'Carregando sua economia' })
    expect(loading.props.accessibilityState).toEqual({ busy: true })
    expect(view.getByRole('header', { name: 'Sua economia' })).toBeOnTheScreen()
    expect(view.queryByRole('button')).toBeNull()
  })

  it('says it waits for the connection when offline', async () => {
    onlineManager.setOnline(false)
    const view = await block({})
    expect(
      view.getByRole('progressbar', {
        name: 'Sem conexão com a internet. O conteúdo aparece aqui assim que a conexão voltar.',
      })
    ).toBeOnTheScreen()
  })

  it('offers a new attempt when the savings could not be read', async () => {
    const refetch = jest.fn()
    const view = await block({ isError: true, refetch })
    expect(view.getByText('Não foi possível carregar sua economia')).toBeOnTheScreen()
    await fireEvent.press(
      view.getByRole('button', { name: 'Tentar de novo: carregar sua economia' })
    )
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('asks for the first use before there is anything to count', async () => {
    const view = await block({ data: savings() })
    expect(view.getByText('Use seu primeiro benefício para começar a contar')).toBeOnTheScreen()
    expect(view.queryByText('Lugares visitados')).toBeNull()
    expect(view.queryByText('Ver sua economia')).toBeNull()
  })

  it('shows an exact amount without "cerca de"', async () => {
    const view = await block({
      data: savings({
        current: {
          ...none,
          editions: [edition],
          places_visited: 2,
          benefits_used: 2,
          savings_exact_cents: 2500,
        },
      }),
    })
    expect(view.getByLabelText('Economia: 25 reais')).toBeOnTheScreen()
    expect(view.getByText(/^R\$\s25,00$/)).toBeOnTheScreen()
    expect(view.queryByText(/cerca de/)).toBeNull()
    expect(view.getByLabelText('Lugares visitados: 2')).toBeOnTheScreen()
    expect(view.getByLabelText('Benefícios usados: 2')).toBeOnTheScreen()
    expect(view.getByText('Nesta edição: Experimente Londrina 2026')).toBeOnTheScreen()
  })

  it('marks an estimate, says why some uses are left out and explains on request', async () => {
    const onOpen = jest.fn()
    const view = await block({ data: estimated }, onOpen)

    expect(view.getByLabelText('Economia estimada: cerca de 32 reais')).toBeOnTheScreen()
    expect(view.getByText(/^cerca de R\$\s32,00$/)).toBeOnTheScreen()
    expect(
      view.getByText('1 uso ficou fora da estimativa: o lugar não informa o ticket médio.')
    ).toBeOnTheScreen()

    const toggle = view.getByRole('button', { name: 'Como calculamos a economia' })
    expect(toggle.props.accessibilityState).toMatchObject({ expanded: false })
    expect(view.queryByTestId('savings-how')).toBeNull()
    await fireEvent.press(toggle)
    expect(toggle.props.accessibilityState).toMatchObject({ expanded: true })
    expect(
      within(view.getByTestId('savings-how')).getByText(/estimados com o ticket médio do lugar/)
    ).toBeOnTheScreen()

    // The latest closed edition, read with the money in words.
    const recap = view.getByTestId('savings-recap-2')
    expect(recap.props.accessibilityLabel).toBe(
      'Experimente Londrina 2025. Em 2025 você visitou 4 lugares e economizou cerca de 120 reais.'
    )
    expect(view.queryByTestId('savings-recap-1')).toBeNull()

    await fireEvent.press(view.getByRole('button', { name: /^Ver sua economia/ }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('keeps the recap of last year while this edition has no use yet', async () => {
    const view = await block({ data: savings({ past: estimated.past }) })
    expect(view.getByText('Use seu primeiro benefício para começar a contar')).toBeOnTheScreen()
    expect(view.getByTestId('savings-recap-2')).toBeOnTheScreen()
    expect(view.getByRole('button', { name: /^Ver sua economia/ })).toBeOnTheScreen()
  })

  it('stacks the counts from the large text step and keeps them side by side below it', async () => {
    await setFontScale(1)
    const small = await block({ data: estimated })
    expect(style(small.getByTestId('savings-counts')).flexDirection).toBe('row')
    await small.unmount()

    await setFontScale(1.3)
    const large = await block({ data: estimated })
    expect(style(large.getByTestId('savings-counts')).flexDirection).toBe('column')
    // No box has a fixed height: each grows with its text.
    for (const label of ['Lugares visitados: 3', 'Benefícios usados: 4']) {
      expect(style(large.getByLabelText(label)).height).toBeUndefined()
    }
  })
})

describe('the Sua economia screen', () => {
  it('reads the private endpoint and shows every edition with its places', async () => {
    api.request.mockResolvedValue(estimated)
    const view = await screen()

    expect(await view.findByRole('header', { name: 'Nesta edição' })).toBeOnTheScreen()
    expect(api.request).toHaveBeenCalledWith('/api/v1/me/savings', {
      authenticated: true,
      sensitive: true,
      signal: expect.any(Object),
    })
    expect(view.getByText('Experimente Londrina 2026')).toBeOnTheScreen()
    expect(view.getByLabelText('Café Aurora, 2 visitas')).toBeOnTheScreen()
    expect(view.getByRole('header', { name: 'Edições anteriores' })).toBeOnTheScreen()
    expect(view.getByTestId('savings-recap-2')).toBeOnTheScreen()
    expect(view.getByLabelText('Mesa Norte, 3 visitas')).toBeOnTheScreen()
    expect(view.getByTestId('savings-recap-1').props.accessibilityLabel).toBe(
      'Experimente Londrina 2024. Em 2024 você visitou 1 lugar e usou 2 benefícios.'
    )
    // The explanation is open here, not behind a toggle.
    expect(view.getByRole('header', { name: 'Como calculamos a economia' })).toBeOnTheScreen()
    expect(view.getByTestId('savings-how')).toBeOnTheScreen()
    expect(view.queryByRole('button', { name: 'Como calculamos a economia' })).toBeNull()
  })

  it('leads an empty screen back to the benefits', async () => {
    api.request.mockResolvedValue(savings())
    const view = await screen()
    expect(
      await view.findByText('Use seu primeiro benefício para começar a contar')
    ).toBeOnTheScreen()
    await fireEvent.press(view.getByRole('button', { name: 'Ver meus benefícios' }))
    expect(mockRouter.navigate).toHaveBeenCalledWith('/wallet')
  })

  it('offers a new attempt when the first read fails', async () => {
    api.request.mockRejectedValueOnce(new TypeError('Network request failed'))
    api.request.mockResolvedValueOnce(estimated)
    const view = await screen()
    expect(await view.findByText('Não foi possível carregar sua economia')).toBeOnTheScreen()
    await fireEvent.press(view.getByRole('button', { name: 'Tentar de novo' }))
    expect(await view.findByRole('header', { name: 'Nesta edição' })).toBeOnTheScreen()
  })

  it('waits for the connection instead of failing offline', async () => {
    onlineManager.setOnline(false)
    api.request.mockResolvedValue(estimated)
    const view = await screen()
    expect(await view.findByTestId('content-offline')).toBeOnTheScreen()
    expect(api.request).not.toHaveBeenCalled()

    await act(async () => onlineManager.setOnline(true))
    expect(await view.findByRole('header', { name: 'Nesta edição' })).toBeOnTheScreen()
  })
})
