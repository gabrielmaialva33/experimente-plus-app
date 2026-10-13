import { act, fireEvent, render, within } from '@testing-library/react-native'
import { AccessibilityInfo, Dimensions } from 'react-native'

import NewsScreen from '@/app/(tabs)/news'
import { contentFrame, MEASURE } from '@/components/content-frame'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-image', () => ({ Image: 'Image' }))
jest.mock('@/api/config', () => ({
  resolveMediaUrl: (url: string) => `https://experimente.test${url}`,
  apiUrl: (path: string) => `https://experimente.test${path}`,
}))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))

const mockPush = jest.fn()
const mockNavigate = jest.fn()
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useRouter: () => ({ push: mockPush, navigate: mockNavigate }),
}))
jest.mock('@/session/context', () => ({ useSession: jest.fn() }))
jest.mock('@/catalog/city-store', () => ({ useSelectedCity: jest.fn() }))
jest.mock('@/catalog/queries', () => ({ useCities: jest.fn(), useCityAgenda: jest.fn() }))
jest.mock('@/explorer/queries', () => ({ useForYou: jest.fn(), useFollowingUpdates: jest.fn() }))
jest.mock('@/help/manual', () => ({
  ...jest.requireActual('@/help/manual'),
  openManual: jest.fn(),
}))
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  onlineManager: { isOnline: () => mockOnline.value, subscribe: () => () => {} },
}))

const mockOnline = { value: true }
const session = jest.requireMock('@/session/context') as { useSession: jest.Mock }
const city = jest.requireMock('@/catalog/city-store') as { useSelectedCity: jest.Mock }
const catalog = jest.requireMock('@/catalog/queries') as Record<string, jest.Mock>
const explorer = jest.requireMock('@/explorer/queries') as Record<string, jest.Mock>

const signedIn = {
  status: 'authenticated',
  context: { user: { id: 7 }, active_operation: { id: 1 } },
}

const card = (id: number, name: string) => ({
  id,
  slug: `lugar-${id}`,
  name,
  city_slug: 'londrina',
  city_name: 'Londrina',
  cover_url: null,
  category: 'Cafés',
})

const place = (slug: string, name: string) => ({
  slug,
  name,
  city: { slug: 'londrina', name: 'Londrina', state_code: 'PR' },
  address: { district: 'Centro', latitude: null, longitude: null },
  primary_category: { name: 'Cafés' },
  cover: null,
})

const update = (kind: 'experience' | 'event' | 'showcase_item', id: number, title: string) => ({
  kind,
  id,
  title,
  description: null,
  published_at: '2026-10-10T12:00:00.000Z',
  starts_at: kind === 'event' ? '2026-10-20T22:00:00.000Z' : null,
  ends_at: kind === 'event' ? '2026-10-21T01:00:00.000Z' : null,
  informational_price_cents: kind === 'showcase_item' ? 2500 : null,
  cover: kind === 'experience' ? { url: '/storage/oficina.png', alt_text: 'Mesa posta' } : null,
  establishment: card(9, 'Ateliê do Café'),
})

const event = (id: number, title: string) => ({
  id,
  kind: 'event' as const,
  title,
  description: null,
  cover: null,
  establishmentName: 'Bar da Praça',
  establishmentSlug: 'bar-da-praca',
  citySlug: 'londrina',
  startsAt: '2026-10-13T22:00:00.000Z',
  endsAt: '2026-10-14T01:00:00.000Z',
})

const agendaOf = (today: unknown[], upcoming: unknown[] = []) => ({
  isPending: false,
  isError: false,
  data: {
    city: { slug: 'londrina', name: 'Londrina', stateCode: 'PR', timeZone: 'America/Sao_Paulo' },
    localDate: '2026-10-13',
    happeningToday: today,
    upcoming,
    newExperiences: [],
    isEmpty: today.length === 0 && upcoming.length === 0,
  },
  refetch: jest.fn(),
})

const followingOf = (updates: unknown[], hasFollows = true, overrides = {}) => ({
  isPending: false,
  isError: false,
  data: {
    pages: [
      {
        data: updates,
        has_follows: hasFollows,
        meta: { total: updates.length, per_page: 10, current_page: 1, last_page: 1 },
      },
    ],
  },
  hasNextPage: false,
  isFetchingNextPage: false,
  isFetchNextPageError: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
  ...overrides,
})

beforeEach(() => {
  jest.clearAllMocks()
  mockOnline.value = true
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
  session.useSession.mockReturnValue(signedIn)
  city.useSelectedCity.mockReturnValue('londrina')
  catalog.useCities.mockReturnValue({ data: [{ slug: 'londrina', name: 'Londrina' }] })
  catalog.useCityAgenda.mockReturnValue(agendaOf([event(1, 'Roda de samba')]))
  explorer.useForYou.mockReturnValue({
    isPending: false,
    isError: false,
    data: { data: [place('cafe-central', 'Café Central')], has_interests: true },
    refetch: jest.fn(),
  })
  explorer.useFollowingUpdates.mockReturnValue(
    followingOf([update('experience', 31, 'Oficina de café')])
  )
})

const headers = (view: Awaited<ReturnType<typeof render>>) =>
  view.getAllByRole('header').map((element) => element.props.children)

describe('the Novidades tab for a person', () => {
  it('shows Para você, the followed places and the city’s agenda, in that order', async () => {
    const view = await render(<NewsScreen />)

    expect(headers(view)).toEqual([
      'Novidades',
      'Para você',
      'Dos lugares que você segue',
      'Agenda da cidade',
      'Hoje',
    ])
    expect(view.getByText('O que há de novo em Londrina')).toBeOnTheScreen()
    // Asked for this person in this operation, so another account never sees them.
    expect(explorer.useForYou).toHaveBeenCalledWith({ operationId: 1, userId: 7 }, 'londrina')
    expect(explorer.useFollowingUpdates).toHaveBeenCalledWith({ operationId: 1, userId: 7 })
    expect(view.queryByTestId('news-sign-in')).toBeNull()
  })

  it('opens what a followed place published on the place’s page, at the item', async () => {
    explorer.useFollowingUpdates.mockReturnValue(
      followingOf([
        update('experience', 31, 'Oficina de café'),
        update('event', 32, 'Noite de jazz'),
        update('showcase_item', 33, 'Bolo de cenoura'),
      ])
    )
    const view = await render(<NewsScreen />)

    const showcase = view.getByTestId('news-update-showcase_item-33')
    expect(showcase.props.accessibilityLabel).toMatch(
      /^Vitrine: Bolo de cenoura, Ateliê do Café, Publicado em .+, preço informativo R\$\s25,00$/
    )
    expect(view.getByTestId('news-update-event-32').props.accessibilityLabel).toMatch(
      /^Evento: Noite de jazz, Ateliê do Café, \d{2} de out\.?, \d{2}:\d{2}–\d{2}:\d{2}$/
    )
    await fireEvent.press(view.getByTestId('news-update-experience-31'))
    expect(mockPush).toHaveBeenCalledWith(
      '/estabelecimento/londrina/lugar-9?destaque=experience-31'
    )
  })

  it('loads more updates on request and says when they arrive', async () => {
    const fetchNextPage = jest.fn().mockResolvedValue({ isError: false })
    explorer.useFollowingUpdates.mockReturnValue(
      followingOf([update('experience', 31, 'Oficina de café')], true, {
        hasNextPage: true,
        fetchNextPage,
      })
    )
    const view = await render(<NewsScreen />)

    await fireEvent.press(view.getByRole('button', { name: 'Ver mais novidades' }))
    expect(fetchNextPage).toHaveBeenCalledTimes(1)
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Mais novidades carregadas.'
    )
  })

  it('keeps "Ver mais" disabled while the next page loads', async () => {
    explorer.useFollowingUpdates.mockReturnValue(
      followingOf([update('experience', 31, 'Oficina de café')], true, {
        hasNextPage: true,
        isFetchingNextPage: true,
      })
    )
    const view = await render(<NewsScreen />)

    expect(view.getByTestId('news-following-more').props.accessibilityState).toMatchObject({
      disabled: true,
    })
  })

  it('invites to follow places when nothing is followed', async () => {
    explorer.useFollowingUpdates.mockReturnValue(followingOf([], false))
    const view = await render(<NewsScreen />)

    const section = within(view.getByTestId('news-following'))
    expect(section.getByText(/Siga lugares para ver aqui o que eles publicam/)).toBeOnTheScreen()
    await fireEvent.press(section.getByRole('button', { name: 'Explorar lugares' }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('leads to the followed places when they published nothing yet', async () => {
    explorer.useFollowingUpdates.mockReturnValue(followingOf([], true))
    const view = await render(<NewsScreen />)

    await fireEvent.press(view.getByRole('button', { name: 'Ver quem você segue' }))
    expect(mockPush).toHaveBeenCalledWith('/conta/seguindo')
  })

  it('invites to choose interests instead of an empty Para você', async () => {
    explorer.useForYou.mockReturnValue({
      isPending: false,
      isError: false,
      data: { data: [], has_interests: false },
      refetch: jest.fn(),
    })
    const view = await render(<NewsScreen />)

    expect(headers(view)).not.toContain('Para você')
    await fireEvent.press(
      view.getByRole('button', { name: 'Escolher interesses para ver lugares para você' })
    )
    expect(mockPush).toHaveBeenCalledWith('/conta/interesses')
  })

  it('offers to edit the interests when none of them has a place in the city', async () => {
    explorer.useForYou.mockReturnValue({
      isPending: false,
      isError: false,
      data: { data: [], has_interests: true },
      refetch: jest.fn(),
    })
    const view = await render(<NewsScreen />)

    expect(
      view.getByText('Nada dos seus interesses publicado em Londrina por enquanto.')
    ).toBeOnTheScreen()
    await fireEvent.press(view.getByRole('button', { name: 'Editar interesses' }))
    expect(mockPush).toHaveBeenCalledWith('/conta/interesses')
  })

  it('offers another try in each section that failed, keeping the others', async () => {
    const forYouRetry = jest.fn()
    const followingRetry = jest.fn()
    const agendaRetry = jest.fn()
    explorer.useForYou.mockReturnValue({ isPending: false, isError: true, refetch: forYouRetry })
    explorer.useFollowingUpdates.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      refetch: followingRetry,
    })
    catalog.useCityAgenda.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      refetch: agendaRetry,
    })
    const view = await render(<NewsScreen />)

    for (const [testID, retry] of [
      ['news-for-you-failed', forYouRetry],
      ['news-following-failed', followingRetry],
      ['news-agenda-failed', agendaRetry],
    ] as const) {
      await fireEvent.press(
        within(view.getByTestId(testID)).getByRole('button', { name: 'Tentar de novo' })
      )
      expect(retry).toHaveBeenCalledTimes(1)
    }
  })

  it('says each section is loading, and what it waits for offline', async () => {
    explorer.useForYou.mockReturnValue({ isPending: true, isError: false })
    explorer.useFollowingUpdates.mockReturnValue({ isPending: true, isError: false })
    catalog.useCityAgenda.mockReturnValue({ isPending: true, isError: false })
    const view = await render(<NewsScreen />)

    expect(view.getByText('Carregando sugestões para você…')).toBeOnTheScreen()
    expect(view.getByText('Carregando as novidades dos lugares que você segue…')).toBeOnTheScreen()
    expect(view.getByText('Carregando a agenda da cidade…')).toBeOnTheScreen()

    mockOnline.value = false
    const offline = await render(<NewsScreen />)
    expect(offline.getAllByText(/^Sem conexão com a internet\./)).toHaveLength(3)
  })

  it('refreshes every section on a pull', async () => {
    const view = await render(<NewsScreen />)

    const control = view.getByTestId('news-scroll').props.refreshControl
    await act(async () => control.props.onRefresh())
    expect(explorer.useForYou.mock.results[0].value.refetch).toHaveBeenCalled()
    expect(explorer.useFollowingUpdates.mock.results[0].value.refetch).toHaveBeenCalled()
    expect(catalog.useCityAgenda.mock.results[0].value.refetch).toHaveBeenCalled()
  })
})

describe('the Novidades tab for a visitor', () => {
  beforeEach(() => session.useSession.mockReturnValue({ status: 'anonymous', context: null }))

  it('shows the agenda and the way to an account, and asks nothing personal', async () => {
    const view = await render(<NewsScreen />)

    expect(view.getByText('Recomendações para você')).toBeOnTheScreen()
    expect(view.queryByTestId('news-for-you')).toBeNull()
    expect(view.queryByTestId('news-following')).toBeNull()
    expect(explorer.useForYou).toHaveBeenCalledWith(null, 'londrina')
    expect(explorer.useFollowingUpdates).toHaveBeenCalledWith(null)
    expect(view.getByTestId('agenda-card-event-1')).toBeOnTheScreen()

    await fireEvent.press(view.getByRole('button', { name: 'Entrar' }))
    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/sign-in')
  })

  it('offers neither prompt nor personal sections while the session loads', async () => {
    session.useSession.mockReturnValue({ status: 'loading', context: null })
    const view = await render(<NewsScreen />)

    expect(view.queryByTestId('news-sign-in')).toBeNull()
    expect(view.queryByTestId('news-following')).toBeNull()
    expect(view.getByTestId('news-agenda')).toBeOnTheScreen()
  })

  it('opens an event of the agenda at its place', async () => {
    const view = await render(<NewsScreen />)

    await fireEvent.press(view.getByTestId('agenda-card-event-1'))
    expect(mockPush).toHaveBeenCalledWith('/estabelecimento/londrina/bar-da-praca?destaque=event-1')
  })

  it('leads to another city when this one has no events', async () => {
    catalog.useCityAgenda.mockReturnValue(agendaOf([], []))
    const view = await render(<NewsScreen />)

    expect(view.getByText('Nenhum evento anunciado em Londrina por enquanto.')).toBeOnTheScreen()
    await fireEvent.press(view.getByRole('button', { name: 'Escolher outra cidade' }))
    expect(mockPush).toHaveBeenCalledWith('/conta/cidade')
  })

  it('asks for a city before anything else when none is chosen', async () => {
    city.useSelectedCity.mockReturnValue(null)
    catalog.useCityAgenda.mockReturnValue({ isPending: true, isError: false })
    const view = await render(<NewsScreen />)

    expect(view.queryByText('Carregando a agenda da cidade…')).toBeNull()
    await fireEvent.press(view.getByRole('button', { name: 'Escolher cidade' }))
    expect(mockPush).toHaveBeenCalledWith('/conta/cidade')
  })

  it('opens the manual at the Novidades section', async () => {
    const view = await render(<NewsScreen />)
    const manual = jest.requireMock('@/help/manual') as { openManual: jest.Mock }

    await fireEvent.press(
      view.getByRole('link', { name: /Abrir o manual: como usar a aba Novidades/ })
    )
    expect(manual.openManual).toHaveBeenCalledWith('news')
  })
})

describe('the Novidades tab on a wide window', () => {
  const original = Dimensions.get('window')
  afterEach(() => act(() => Dimensions.set({ window: original })))

  it('keeps its sections in the feed’s column and lays updates in a grid', async () => {
    await act(() =>
      Dimensions.set({ window: { ...original, width: 1280, height: 800, fontScale: 1 } })
    )
    explorer.useFollowingUpdates.mockReturnValue(
      followingOf([update('experience', 31, 'Oficina de café'), update('event', 32, 'Jazz')])
    )
    const view = await render(<NewsScreen />)

    const column = contentFrame(1280, MEASURE.feed)
    const header = view.getByTestId('screen-header')
    expect(header.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining(column.padding)])
    )
    const widths = ['news-update-experience-31', 'news-update-event-32'].map((testID) => {
      const style = [view.getByTestId(testID).props.style].flat(Infinity)
      return Object.assign({}, ...style).width
    })
    expect(widths[0]).toBeLessThan(column.width)
    expect(widths[0]).toBe(widths[1])
  })
})
