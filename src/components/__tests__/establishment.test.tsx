import { act, fireEvent, render, within } from '@testing-library/react-native'
import { Linking, ScrollView, Share, StyleSheet } from 'react-native'

import EstablishmentScreen from '@/app/estabelecimento/[city]/[slug]'
import type { EstablishmentDetail, EstablishmentSummary } from '@/catalog/types'
import { EstablishmentCard } from '@/components/establishment-card'
import { EstablishmentCover } from '@/components/establishment-cover'
import { OperatingStatus } from '@/components/operating-status'
import { PracticalInfo } from '@/place/practical-info'
import { palette, fontFamilies, minTouch } from '@/theme/tokens'

const mockRouter = { push: jest.fn(), back: jest.fn() }
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: jest.fn(() => null) },
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 0, left: 0 }),
}))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').View }))
jest.mock('@/analytics/events', () => ({ track: jest.fn() }))
jest.mock('@/api/client', () => ({ ApiError: class ApiError extends Error {} }))
jest.mock('@/purchases/queries', () => ({ usePurchaseEditions: jest.fn() }))
jest.mock('@/catalog/queries', () => ({ useEstablishment: jest.fn() }))
jest.mock('@/session/context', () => ({ useSession: jest.fn() }))
jest.mock('@/reviews/queries', () => ({
  useEstablishmentReviews: () => ({ data: undefined, isError: false }),
}))
const mockToggle = jest.fn()
jest.mock('@/explorer/queries', () => ({
  useSavedStatus: jest.fn(),
  useToggleSaved: () => ({ mutate: mockToggle, isPending: false }),
  useSavedContent: () => ({ data: undefined }),
  useToggleSavedContent: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock('@/partner-content/queries', () => ({ usePartnerContent: jest.fn() }))
jest.mock('@/place/follow-hint', () => ({
  followExplained: jest.fn(),
  markFollowExplained: jest.fn(),
}))
jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))

const queries = jest.requireMock('@/catalog/queries') as { useEstablishment: jest.Mock }
const theme = jest.requireMock('@/theme/use-colors') as { useColors: jest.Mock }
const router = jest.requireMock('expo-router') as {
  useLocalSearchParams: jest.Mock
  Stack: { Screen: jest.Mock }
}
const session = jest.requireMock('@/session/context') as { useSession: jest.Mock }
const purchases = jest.requireMock('@/purchases/queries') as { usePurchaseEditions: jest.Mock }
const content = jest.requireMock('@/partner-content/queries') as { usePartnerContent: jest.Mock }
const saved = jest.requireMock('@/explorer/queries') as { useSavedStatus: jest.Mock }
const hint = jest.requireMock('@/place/follow-hint') as {
  followExplained: jest.Mock
  markFollowExplained: jest.Mock
}

const detail: EstablishmentDetail = {
  id: 1,
  slug: 'cafe',
  name: 'Café da Praça',
  short_description: null,
  description: null,
  reviews: { count: 0, average: null },
  city: { slug: 'londrina', name: 'Londrina', state_code: 'PR', timezone: 'America/Sao_Paulo' },
  address: {
    postal_code: null,
    street: 'Rua Central',
    number: '10',
    without_number: false,
    complement: null,
    district: 'Centro',
    reference: null,
    latitude: -23.31,
    longitude: -51.16,
  },
  contacts: {
    phone: '43999999999',
    whatsapp: '43999999999',
    email: null,
    website: 'https://example.com',
    instagram: null,
    booking_url: null,
  },
  business_status: 'open',
  availability_type: 'regular_hours',
  is_open_now: false,
  categories: [],
  attributes: [],
  opening_hours: {
    weekly: [
      {
        weekday: 1,
        opens_at: '09:00:00',
        closes_at: '18:00:00',
        spans_next_day: false,
        sort_order: 0,
      },
    ],
    special_days: [],
  },
  media: [],
  cover: {
    purpose: 'cover',
    is_cover: true,
    sort_order: 0,
    alt_text: 'Fachada do café',
    caption: null,
    asset: {
      url: 'https://example.com/cover.jpg',
      mime_type: 'image/jpeg',
      file_extension: 'jpg',
      width: 800,
      height: 600,
    },
  },
  is_sponsored: false,
  published_at: '',
  updated_at: '',
}

beforeEach(() => {
  jest.clearAllMocks()
  theme.useColors.mockReturnValue(palette.light)
  queries.useEstablishment.mockReturnValue({ data: detail, isPending: false, isError: false })
  router.useLocalSearchParams.mockReturnValue({ city: 'londrina', slug: 'cafe' })
  session.useSession.mockReturnValue({ status: 'anonymous' })
  purchases.usePurchaseEditions.mockReturnValue({ data: { products: [] } })
  content.usePartnerContent.mockReturnValue({ data: [], isPending: false, isError: false })
  hint.followExplained.mockReturnValue(false)
  saved.useSavedStatus.mockReturnValue({ data: undefined })
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('establishment presentation', () => {
  // Direction A (audit A11): orange is kept for the benefit, so the route is the
  // page's navy main action, and contacts are rows of the practical block.
  it.each(['light', 'dark'] as const)(
    'gives directions the navy main action and lists contacts as rows in %s',
    async (mode) => {
      theme.useColors.mockReturnValue(palette[mode])
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
      const view = await render(<EstablishmentScreen />)

      const route = view.getByRole('button', { name: 'Como chegar' })
      expect(route).toHaveStyle({ backgroundColor: palette[mode].primary })
      for (const label of ['WhatsApp', 'Ligar', 'Site']) {
        expect(view.getByRole('button', { name: label })).toHaveStyle({
          backgroundColor: palette[mode].card,
          minHeight: 56,
        })
        expect(view.getByText(label)).toHaveStyle({ color: palette[mode].foreground })
      }
      await fireEvent.press(route)
      expect(openURL).toHaveBeenCalledWith(
        'https://www.google.com/maps/dir/?api=1&destination=-23.31,-51.16'
      )
      expect(view.getByText('Fechado agora')).toBeOnTheScreen()
    }
  )

  it.each(['light', 'dark'] as const)(
    'never sinks interactive contacts below their supporting plane in %s',
    async (mode) => {
      theme.useColors.mockReturnValue(palette[mode])
      const view = await render(<EstablishmentScreen />)
      const levels = [
        palette[mode].surfaceBase,
        palette[mode].surfaceRaised,
        palette[mode].surfaceOverlay,
      ] as readonly string[]
      for (const name of ['WhatsApp', 'Ligar', 'Site']) {
        const button = view.getByRole('button', { name })
        const background = StyleSheet.flatten(button.props.style).backgroundColor
        let parent = button.parent
        while (parent && !StyleSheet.flatten(parent.props.style)?.backgroundColor)
          parent = parent.parent
        const support = StyleSheet.flatten(parent?.props.style)?.backgroundColor
        expect(levels.indexOf(support)).toBeGreaterThanOrEqual(0)
        expect(levels.indexOf(background)).toBeGreaterThanOrEqual(levels.indexOf(support))
        expect(background).not.toBe(palette[mode].cta)
      }
    }
  )

  it('promotes an existing contact when coordinates are absent', async () => {
    queries.useEstablishment.mockReturnValue({
      data: {
        ...detail,
        address: { ...detail.address, latitude: null, longitude: null },
      },
    })
    const view = await render(<EstablishmentScreen />)
    expect(view.queryByRole('button', { name: 'Como chegar' })).toBeNull()
    expect(view.getAllByRole('button', { name: 'WhatsApp' })).toHaveLength(1)
    expect(view.getByRole('button', { name: 'WhatsApp' })).toHaveStyle({
      backgroundColor: palette.light.primary,
    })
  })

  it('offers the e-mail and the Instagram a place publishes', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    queries.useEstablishment.mockReturnValue({
      data: {
        ...detail,
        contacts: { ...detail.contacts, email: 'contato@cafe.com.br', instagram: '@cafedapraca' },
      },
    })
    const view = await render(<EstablishmentScreen />)

    await fireEvent.press(view.getByRole('button', { name: 'E-mail' }))
    expect(openURL).toHaveBeenLastCalledWith('mailto:contato@cafe.com.br')
    await fireEvent.press(view.getByRole('button', { name: 'Instagram' }))
    expect(openURL).toHaveBeenLastCalledWith('https://instagram.com/cafedapraca')
    expect(view.queryByText('Sem contato cadastrado')).toBeNull()
  })

  it('says so when a place has no way to be reached, instead of leaving the space empty', async () => {
    queries.useEstablishment.mockReturnValue({
      data: {
        ...detail,
        contacts: {
          phone: null,
          whatsapp: null,
          email: null,
          website: null,
          instagram: null,
          booking_url: null,
        },
      },
    })
    const view = await render(<EstablishmentScreen />)

    expect(view.getByRole('button', { name: 'Como chegar' })).toBeOnTheScreen()
    expect(view.getByText('Sem contato cadastrado')).toBeOnTheScreen()
  })

  // The card speaks as one: name first, its state, and the rating in words, not "★ (2)".
  it('reads a place card as one sentence, the rating in words', async () => {
    const summary: EstablishmentSummary = {
      ...detail,
      primary_category: { name: 'Cafés' } as EstablishmentSummary['primary_category'],
      reviews: { count: 2, average: 4.5 },
      is_sponsored: true,
    }
    const view = await render(<EstablishmentCard establishment={summary} onPress={jest.fn()} />)
    expect(
      view.getByRole('button', {
        name: 'Café da Praça, Fechado agora, Cafés, Centro, Nota 4,5 de 5, 2 avaliações, Patrocinado',
      })
    ).toBeOnTheScreen()
  })

  // The photo that opens a place is reached and read by its description.
  it('lets a screen reader reach the place photo by its description', async () => {
    const view = await render(<EstablishmentScreen />)
    expect(view.getByLabelText('Fachada do café').props.accessible).toBe(true)
  })

  it('shows a temporary closure in both the detail and list card', async () => {
    const closed = { ...detail, business_status: 'temporarily_closed' as const }
    queries.useEstablishment.mockReturnValue({ data: closed })
    const summary: EstablishmentSummary = { ...closed, primary_category: null }
    const view = await render(
      <>
        <EstablishmentScreen />
        <EstablishmentCard establishment={summary} onPress={jest.fn()} />
      </>
    )
    expect(view.getAllByText('Fechado temporariamente')).toHaveLength(2)
  })

  it.each(['regular_hours', 'appointment_only'] as const)(
    'keeps a false search result generic while the detail can explain %s',
    async (availability_type) => {
      const { availability_type: _availability, ...searchFields } = detail
      const summary: EstablishmentSummary = { ...searchFields, primary_category: null }
      const view = await render(<EstablishmentCard establishment={summary} onPress={jest.fn()} />)
      expect(view.getByText('Consulte o atendimento')).toBeOnTheScreen()
      expect(view.queryByText('Fechado agora')).toBeNull()
      expect(view.queryByText('Somente com agendamento')).toBeNull()

      queries.useEstablishment.mockReturnValue({ data: { ...detail, availability_type } })
      await view.rerender(<EstablishmentScreen />)
      expect(view.queryByText('Consulte o atendimento')).toBeNull()
      expect(
        view.getAllByText(
          availability_type === 'appointment_only' ? 'Somente com agendamento' : 'Fechado agora'
        ).length
      ).toBeGreaterThan(0)
    }
  )

  it('reads the city day, closed days included, and follows it across local midnight', async () => {
    jest.useFakeTimers({ now: new Date('2026-09-07T02:59:30Z') })
    const view = await render(<EstablishmentScreen />)
    expect(view.getByText('Hoje, domingo: fechado')).toBeOnTheScreen()
    await fireEvent.press(view.getByRole('button', { name: 'Ver horários da semana' }))
    expect(view.getByText('Terça a domingo · Hoje')).toBeOnTheScreen()
    expect(view.getByText('Fechado')).toBeOnTheScreen()
    expect(view.getByText('09:00 às 18:00')).toBeOnTheScreen()

    await act(async () => {
      jest.advanceTimersByTime(60_000)
    })
    expect(view.queryByText('Hoje, domingo: fechado')).toBeNull()
    expect(view.getByText('Hoje, segunda: 09:00 às 18:00')).toBeOnTheScreen()
    expect(view.getByText('Segunda · Hoje')).toBeOnTheScreen()
    await view.unmount()
  })

  it('describes appointment-only hours without showing a closed week', async () => {
    queries.useEstablishment.mockReturnValue({
      data: { ...detail, availability_type: 'appointment_only' },
    })
    const view = await render(<EstablishmentScreen />)
    const info = within(view.getByLabelText('Informações práticas'))
    expect(info.getByText('Somente com agendamento')).toBeOnTheScreen()
    expect(info.getByText('Combine o horário pelos contatos')).toBeOnTheScreen()
    expect(info.queryByText('Fechado')).toBeNull()
    expect(view.queryByRole('button', { name: 'Ver horários da semana' })).toBeNull()
  })

  it('shows habitual 24-hour availability and discloses special-day exceptions', async () => {
    queries.useEstablishment.mockReturnValue({
      data: {
        ...detail,
        availability_type: 'always_open',
        opening_hours: { weekly: [], special_days: [{ date: '2026-09-07', status: 'closed' }] },
      },
    })
    const view = await render(<EstablishmentScreen />)
    expect(view.getByText('Todos os dias, 24 horas')).toBeOnTheScreen()
    expect(view.getByText(/Há horários especiais/)).toBeOnTheScreen()
  })
})

// Share, follow, itinerary and favourite live in the place's own chrome and
// actions; these carry over what the retired SaveActions row guaranteed.
describe('saving and sharing a place', () => {
  it('lets a visitor share, since sharing belongs to nobody', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' })
    const view = await render(<EstablishmentScreen />)

    await fireEvent.press(view.getByRole('button', { name: 'Compartilhar' }))

    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Café da Praça',
        url: expect.stringMatching(/\/cidades\/londrina\/estabelecimentos\/cafe$/),
      })
    )
    expect(mockRouter.push).not.toHaveBeenCalled()
  })

  it('takes a visitor to sign in instead of toggling something that would fail', async () => {
    const view = await render(<EstablishmentScreen />)

    await fireEvent.press(view.getByRole('button', { name: 'Seguir Café da Praça' }))
    await fireEvent.press(view.getByRole('button', { name: 'Adicionar a um roteiro' }))

    expect(mockToggle).not.toHaveBeenCalled()
    expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/sign-in')
    expect(mockRouter.push).not.toHaveBeenCalledWith('/roteiros/adicionar/1')
  })

  it('opens the itinerary picker for a signed-in explorer', async () => {
    session.useSession.mockReturnValue({ status: 'authenticated' })
    const view = await render(<EstablishmentScreen />)

    await fireEvent.press(view.getByRole('button', { name: 'Adicionar a um roteiro' }))

    expect(mockRouter.push).toHaveBeenCalledWith('/roteiros/adicionar/1')
  })

  it('announces what the server says is saved and toggles to the opposite', async () => {
    session.useSession.mockReturnValue({ status: 'authenticated' })
    saved.useSavedStatus.mockReturnValue({ data: { favorited: true, following: false } })
    const view = await render(<EstablishmentScreen />)

    const favorite = view.getByRole('button', { name: 'Remover Café da Praça dos favoritos' })
    expect(favorite).toBeSelected()
    expect(view.getByRole('button', { name: 'Seguir Café da Praça' })).not.toBeSelected()

    await fireEvent.press(favorite)
    expect(mockToggle).toHaveBeenCalledWith(false)
  })
})

describe.each(['light', 'dark'] as const)('canonical status appearance in %s', (mode) => {
  it.each([
    {
      business_status: 'permanently_closed',
      is_open_now: true,
      availability_type: 'appointment_only',
      label: 'Encerrado permanentemente',
      tone: 'muted',
    },
    {
      business_status: 'temporarily_closed',
      is_open_now: true,
      availability_type: 'appointment_only',
      label: 'Fechado temporariamente',
      tone: 'warning',
    },
    {
      business_status: 'open',
      is_open_now: true,
      availability_type: 'appointment_only',
      label: 'Somente com agendamento',
      tone: 'info',
    },
    { business_status: 'open', is_open_now: true, label: 'Aberto agora', tone: 'success' },
    {
      business_status: 'open',
      is_open_now: false,
      availability_type: 'regular_hours',
      label: 'Fechado agora',
      tone: 'muted',
    },
    { business_status: 'open', is_open_now: false, label: 'Consulte o atendimento', tone: 'muted' },
  ] as const)(
    '$label uses its canonical background, text and border',
    async ({ label, tone, ...establishment }) => {
      const colors = palette[mode]
      theme.useColors.mockReturnValue(colors)
      const borders = {
        light: {
          warning: 'rgba(233, 175, 65, 0.3)',
          info: 'rgba(27, 102, 132, 0.25)',
          success: 'rgba(17, 115, 66, 0.25)',
        },
        dark: {
          warning: 'rgba(246, 185, 81, 0.3)',
          info: 'rgba(105, 205, 242, 0.25)',
          success: 'rgba(81, 214, 137, 0.25)',
        },
      }[mode]
      const expected = {
        // The neutral status role: muted in light, the raised surface in dark.
        muted: {
          backgroundColor: colors.statusNeutral,
          color: colors.statusNeutralForeground,
          borderColor: colors.statusNeutralBorder,
        },
        warning: {
          backgroundColor: colors.warningSoft,
          color: colors.warningAccent,
          borderColor: borders.warning,
        },
        info: {
          backgroundColor: colors.infoSoft,
          color: colors.infoAccent,
          borderColor: borders.info,
        },
        success: {
          backgroundColor: colors.successSoft,
          color: colors.successAccent,
          borderColor: borders.success,
        },
      }[tone]
      const view = await render(<OperatingStatus establishment={establishment} />)
      expect(view.getByTestId('operating-status')).toHaveStyle({
        backgroundColor: expected.backgroundColor,
        borderColor: expected.borderColor,
      })
      expect(view.getByText(label)).toHaveStyle({ color: expected.color })
    }
  )
})

describe('cover fallback', () => {
  it.each([null, { ...detail.cover, asset: { ...detail.cover.asset, width: 8, height: 6 } }])(
    'does not mount an image for a missing or tiny cover (%p)',
    async (cover) => {
      const view = await render(<EstablishmentCover cover={cover} detail />)
      expect(view.getByText('Foto indisponível')).toBeOnTheScreen()
      expect(view.queryByLabelText('Fachada do café')).toBeNull()
    }
  )

  it('falls back after an image error and retries when a different cover arrives', async () => {
    const view = await render(<EstablishmentCover cover={detail.cover} />)
    const image = view.getByLabelText('Fachada do café')
    await fireEvent(image, 'error', { error: 'failed to load' })
    expect(view.getByText('Foto indisponível')).toBeOnTheScreen()

    await view.rerender(
      <EstablishmentCover
        cover={{
          ...detail.cover,
          asset: { ...detail.cover.asset, url: 'https://example.com/new.jpg' },
        }}
      />
    )
    expect(view.queryByText('Foto indisponível')).toBeNull()
    expect(view.getByLabelText('Fachada do café')).toBeOnTheScreen()
  })
})

it.each(['light', 'dark'] as const)(
  'keeps missing and tiny photos on absence, never brand or conversion, in %s',
  async (mode) => {
    theme.useColors.mockReturnValue(palette[mode])
    const view = await render(<EstablishmentCover cover={null} />)
    const label = view.getByText('Foto indisponível')
    expect(label).toHaveStyle({ color: palette[mode].contentAbsentForeground })
    expect(label.parent?.parent).toHaveStyle({ backgroundColor: palette[mode].contentAbsent })
    expect(label.parent?.parent).not.toHaveStyle({ backgroundColor: palette[mode].primary })
    expect(label.parent?.parent).not.toHaveStyle({ backgroundColor: palette[mode].cta })
    await view.rerender(
      <EstablishmentCover
        cover={{ ...detail.cover, asset: { ...detail.cover.asset, width: 8, height: 6 } }}
        detail
      />
    )
    expect(view.getByText('Foto indisponível').parent?.parent).toHaveStyle({
      backgroundColor: palette[mode].contentAbsent,
    })
  }
)

describe.each(['light', 'dark'] as const)('card cover seam in %s', (mode) => {
  it.each([true, false])(
    'separates the body with a continuous border and inset, with photo=%s',
    async (photo) => {
      theme.useColors.mockReturnValue(palette[mode])
      const view = await render(
        <EstablishmentCard
          establishment={{
            ...detail,
            primary_category: null,
            cover: photo
              ? detail.cover
              : {
                  ...detail.cover,
                  asset: { ...detail.cover.asset, width: 8, height: 6 },
                },
          }}
          onPress={jest.fn()}
        />
      )
      if (photo) expect(view.getByLabelText('Fachada do café')).toBeOnTheScreen()
      else expect(view.getByText('Foto indisponível')).toBeOnTheScreen()
      const body = view.getByText(detail.name).parent!
      expect(body).toHaveStyle({ borderTopWidth: 1, borderTopColor: palette[mode].borderSubtle })
      const inset = StyleSheet.flatten(body.props.style)
      expect(inset.paddingTop).toBeGreaterThan(0)
      expect(inset.paddingHorizontal).toBeGreaterThan(0)
      expect(view.getByRole('button')).toHaveStyle({ overflow: 'hidden' })
    }
  )
})

it.each(['light', 'dark'] as const)(
  'keeps absence, today and neutral status distinct in the rendered surfaces in %s',
  async (mode) => {
    jest.useFakeTimers({ now: new Date('2026-09-07T16:00:00Z') })
    theme.useColors.mockReturnValue(palette[mode])
    const view = await render(
      <>
        <EstablishmentCover />
        <PracticalInfo detail={detail} contacts={[]} />
        <OperatingStatus establishment={detail} />
      </>
    )
    await fireEvent.press(view.getByRole('button', { name: 'Ver horários da semana' }))
    const absentLabel = view.getByText('Foto indisponível')
    const absent = absentLabel.parent!.parent!
    expect(absent).toHaveStyle({ backgroundColor: palette[mode].contentAbsent })
    expect(absentLabel).toHaveStyle({ color: palette[mode].contentAbsentForeground })
    expect(absentLabel.parent).toHaveStyle({
      borderStyle: 'dashed',
      borderColor: palette[mode].contentAbsentBorder,
    })
    const todayLabel = view.getByText('Segunda · Hoje')
    const today = todayLabel.parent!
    expect(today).toHaveStyle({
      backgroundColor: palette[mode].temporalEmphasis,
      borderLeftWidth: 3,
      borderColor: palette[mode].temporalEmphasisBorder,
    })
    expect(todayLabel).toHaveStyle({ color: palette[mode].temporalEmphasisForeground })
    const status = view.getByTestId('operating-status')
    expect(status).toHaveStyle({
      backgroundColor: palette[mode].statusNeutral,
      borderStyle: undefined,
    })
    expect(view.getByText('Fechado agora')).toHaveStyle({
      color: palette[mode].statusNeutralForeground,
    })
    expect(
      new Set(
        [absent, today, status].map((node) => StyleSheet.flatten(node.props.style).backgroundColor)
      ).size
    ).toBe(3)
  }
)

it('reserves an initial detail skeleton until the establishment resolves', async () => {
  queries.useEstablishment.mockReturnValue({ isPending: true })
  const view = await render(<EstablishmentScreen />)
  expect(
    view.getByRole('progressbar', { name: 'Carregando lugar' }).props.accessibilityState
  ).toEqual({ busy: true })
  expect(view.queryByRole('button', { name: 'Como chegar' })).toBeNull()
  queries.useEstablishment.mockReturnValue({ data: detail })
  await view.rerender(<EstablishmentScreen />)
  expect(view.queryByRole('progressbar')).toBeNull()
  expect(view.getByRole('button', { name: 'Como chegar' })).toBeOnTheScreen()
})

describe('place page in direction A', () => {
  const offer = {
    id: 9,
    edition_id: 5,
    offer_id: 9,
    product_type: 'offer',
    purchasable: true,
    name: 'Item em dobro',
    amount_cents: 1490,
    currency: 'BRL',
    usage_ends_at: '2027-05-09T15:00:00Z',
    city: { slug: 'londrina' },
    establishment: { slug: 'cafe' },
    snapshot: { offers: [{ title: 'Item em dobro', description: 'Peça um e ganhe outro igual.' }] },
  }
  const event = (id: number) => ({
    id,
    kind: 'event',
    title: `Degustação ${id}`,
    description: 'Cafés especiais.',
    starts_at: '2026-09-28T19:00:00Z',
    ends_at: '2026-09-28T21:00:00Z',
    media: [],
  })
  const week = (weekdays: number[], opens: string, closes: string) =>
    weekdays.map((weekday) => ({
      weekday,
      opens_at: opens,
      closes_at: closes,
      spans_next_day: false,
      sort_order: 0,
    }))

  it('sells the place’s benefit as a ticket with the page’s one orange action (A11)', async () => {
    purchases.usePurchaseEditions.mockReturnValue({ data: { products: [offer] } })
    const view = await render(<EstablishmentScreen />)

    const cta = view.getByRole('button', { name: /^Ver oferta · Item em dobro · R\$\s14,90$/ })
    expect(cta).toHaveStyle({ backgroundColor: palette.light.cta })
    expect(view.getByText('BENEFÍCIO')).toBeOnTheScreen()
    expect(view.getByText('Peça um e ganhe outro igual. Válido até 09/05/2027.')).toBeOnTheScreen()
    expect(view.getByRole('button', { name: 'Como chegar' })).not.toHaveStyle({
      backgroundColor: palette.light.cta,
    })
    await fireEvent.press(cta)
    expect(mockRouter.push).toHaveBeenCalledWith('/compra/5?offerId=9')
  })

  it('reads a uniform week as one line (A9)', async () => {
    queries.useEstablishment.mockReturnValue({
      data: {
        ...detail,
        opening_hours: {
          weekly: week([0, 1, 2, 3, 4, 5, 6], '08:00:00', '23:00:00'),
          special_days: [],
        },
      },
    })
    const view = await render(<EstablishmentScreen />)
    expect(view.getByText('Todos os dias, 08:00 às 23:00')).toBeOnTheScreen()
    expect(view.queryByRole('button', { name: 'Ver horários da semana' })).toBeNull()
    expect(view.queryByText('Domingo')).toBeNull()
  })

  it('shows today and keeps the grouped week one tap away (A9)', async () => {
    jest.useFakeTimers({ now: new Date('2026-09-07T16:00:00Z') })
    queries.useEstablishment.mockReturnValue({
      data: {
        ...detail,
        opening_hours: { weekly: week([1, 2, 3, 4, 5], '09:00:00', '18:00:00'), special_days: [] },
      },
    })
    const view = await render(<EstablishmentScreen />)
    expect(view.getByText('Hoje, segunda: 09:00 às 18:00')).toBeOnTheScreen()
    expect(view.queryByText('Sábado e domingo')).toBeNull()

    await fireEvent.press(view.getByRole('button', { name: 'Ver horários da semana' }))
    expect(view.getByText('Segunda a sexta · Hoje')).toBeOnTheScreen()
    expect(view.getByText('Sábado e domingo')).toBeOnTheScreen()
    expect(view.getByTestId('hours-Segunda a sexta')).toHaveStyle({
      backgroundColor: palette.light.temporalEmphasis,
    })
    await view.unmount()
  })

  // A 44 target drawn in the 32 row of signals: the margins give the extra height back,
  // so the header keeps its rhythm, and the row reaches as far as the target does.
  it('makes the rating link a full touch target without moving the header', async () => {
    queries.useEstablishment.mockReturnValue({
      data: { ...detail, reviews: { count: 2, average: 4.5 } },
    })
    const view = await render(<EstablishmentScreen />)
    const rating = view.getByRole('link', { name: 'Nota 4,5 de 5, 2 avaliações' })
    const own = StyleSheet.flatten(rating.props.style)
    expect(own.minHeight).toBe(minTouch)
    expect(own.minHeight + 2 * own.marginVertical).toBe(32)
    const row = StyleSheet.flatten(rating.parent!.props.style)
    expect(row.paddingVertical).toBe(-own.marginVertical)
    expect(row.marginVertical).toBe(own.marginVertical)
    expect(rating.props.hitSlop).toBeUndefined()
  })

  it('names the header after the place and keeps its report in the "⋯" (A32, A40, A43)', async () => {
    const view = await render(<EstablishmentScreen />)
    const calls = router.Stack.Screen.mock.calls
    expect(calls[calls.length - 1][0].options).toEqual({
      headerShown: false,
      title: 'Café da Praça',
    })

    expect(view.queryByText('Denunciar este lugar')).toBeNull()
    await fireEvent.press(view.getByRole('button', { name: 'Mais opções de Café da Praça' }))
    await fireEvent.press(view.getByText('Denunciar este lugar'))
    expect(mockRouter.push).toHaveBeenCalledWith(
      '/denunciar/establishment/1?nome=Caf%C3%A9%20da%20Pra%C3%A7a'
    )
  })

  // The photo's controls scroll away with it; a compact bar takes over so back
  // and the place's name never leave the screen. One set is reachable at a time.
  describe.each(['light', 'dark'] as const)('compact bar in %s', (mode) => {
    const labels = ['Voltar', 'Favoritar Café da Praça', 'Mais opções de Café da Praça']
    const scrollTo = (view: Awaited<ReturnType<typeof render>>, y: number) =>
      fireEvent.scroll(view.getByTestId('place-scroll'), {
        nativeEvent: { contentOffset: { x: 0, y } },
      })

    beforeEach(() => theme.useColors.mockReturnValue(palette[mode]))

    it('keeps the floating controls reachable while the photo is in view', async () => {
      const view = await render(<EstablishmentScreen />)
      for (const y of [0, 100]) {
        await scrollTo(view, y)
        expect(view.queryByTestId('place-bar')).toBeNull()
        expect(
          view.getByTestId('place-bar', { includeHiddenElements: true }).props.pointerEvents
        ).toBe('none')
        expect(view.getByRole('button', { name: 'Compartilhar' })).toBeOnTheScreen()
        expect(view.getByTestId('place-favorite')).toBeOnTheScreen()
        for (const name of labels) expect(view.getAllByRole('button', { name })).toHaveLength(1)
      }
      // The bar carries the same labels, out of reach until it is shown.
      for (const name of labels) {
        expect(view.getAllByRole('button', { name, includeHiddenElements: true })).toHaveLength(2)
      }
    })

    it('names the place and keeps back, favourite and "⋯" once the photo scrolls away', async () => {
      const view = await render(<EstablishmentScreen />)
      await scrollTo(view, 400)

      const bar = view.getByTestId('place-bar')
      expect(bar.props.pointerEvents).toBe('auto')
      expect(bar).toHaveStyle({
        backgroundColor: palette[mode].surfaceBase,
        borderBottomColor: palette[mode].borderSubtle,
      })
      const title = within(bar).getByText('Café da Praça')
      expect(title).toHaveStyle({
        color: palette[mode].foreground,
        fontFamily: fontFamilies.display[800],
      })
      expect(title.props.numberOfLines).toBe(1)
      for (const name of labels) {
        expect(within(bar).getByRole('button', { name })).toHaveStyle({
          height: minTouch,
          width: minTouch,
        })
        // Never announced twice: the floating copy is hidden while the bar stands in for it.
        expect(view.getAllByRole('button', { name })).toHaveLength(1)
      }
      expect(view.queryByRole('button', { name: 'Compartilhar' })).toBeNull()
      expect(view.queryByTestId('place-favorite')).toBeNull()

      await fireEvent.press(within(bar).getByRole('button', { name: 'Voltar' }))
      expect(mockRouter.back).toHaveBeenCalledTimes(1)
      await fireEvent.press(within(bar).getByRole('button', { name: 'Favoritar Café da Praça' }))
      expect(mockRouter.push).toHaveBeenLastCalledWith('/(tabs)/sign-in')
      await fireEvent.press(
        within(bar).getByRole('button', { name: 'Mais opções de Café da Praça' })
      )
      await fireEvent.press(view.getByText('Denunciar este lugar'))
      expect(mockRouter.push).toHaveBeenLastCalledWith(
        '/denunciar/establishment/1?nome=Caf%C3%A9%20da%20Pra%C3%A7a'
      )

      // Back on the photo, the floating set returns and the bar steps aside.
      await scrollTo(view, 0)
      expect(view.queryByTestId('place-bar')).toBeNull()
      expect(view.getByRole('button', { name: 'Compartilhar' })).toBeOnTheScreen()
      for (const name of labels) expect(view.getAllByRole('button', { name })).toHaveLength(1)
    })

    it('favourites from the bar with the same toggle as the photo', async () => {
      session.useSession.mockReturnValue({ status: 'authenticated' })
      const view = await render(<EstablishmentScreen />)
      await scrollTo(view, 400)
      await fireEvent.press(
        within(view.getByTestId('place-bar')).getByRole('button', {
          name: 'Favoritar Café da Praça',
        })
      )
      expect(mockToggle).toHaveBeenCalledWith(true)
    })
  })

  it('brings the bar in sooner when the place has no photo', async () => {
    queries.useEstablishment.mockReturnValue({ data: { ...detail, cover: null } })
    const view = await render(<EstablishmentScreen />)
    await fireEvent.scroll(view.getByTestId('place-scroll'), {
      nativeEvent: { contentOffset: { x: 0, y: 100 } },
    })
    expect(within(view.getByTestId('place-bar')).getByText('Café da Praça')).toBeOnTheScreen()
  })

  it('shows its experiences and events under one title, in cards of one size (A41, A42)', async () => {
    content.usePartnerContent.mockImplementation((_id: number, kind: string) => ({
      data: kind === 'events' ? [event(11)] : [],
      isPending: false,
      isError: false,
    }))
    const view = await render(<EstablishmentScreen />)
    expect(view.getByText('Para viver aqui')).toBeOnTheScreen()
    expect(view.queryByText('Descubra mais neste lugar')).toBeNull()
    expect(view.queryByText('Eventos')).toBeNull()
    expect(view.getByTestId('date-tile', { includeHiddenElements: true })).toBeOnTheScreen()
    // The tile is drawn; the card says the day and the hours in words, in the city's zone.
    expect(
      view.getByRole('button', {
        name: /^Evento, Degustação 11, 28 de set\. de 2026 · 16:00–18:00$/,
      })
    ).toBeOnTheScreen()

    await fireEvent.press(view.getByRole('button', { name: /^Evento, Degustação 11/ }))
    expect(view.getByText('Cafés especiais.')).toBeOnTheScreen()
  })

  it('opens on the event a link names: marks it and scrolls to it (A14)', async () => {
    router.useLocalSearchParams.mockReturnValue({
      city: 'londrina',
      slug: 'cafe',
      destaque: 'event-12',
    })
    content.usePartnerContent.mockImplementation((_id: number, kind: string) => ({
      data: kind === 'events' ? [event(11), event(12)] : [],
      isPending: false,
      isError: false,
    }))
    const scrollTo = (ScrollView.prototype as unknown as { scrollTo: jest.Mock }).scrollTo
    const view = await render(<EstablishmentScreen />)

    expect(view.getByTestId('content-event-12')).toHaveStyle({ borderColor: palette.light.primary })
    expect(view.getByTestId('content-event-11')).toHaveStyle({ borderColor: 'transparent' })
    await fireEvent(view.getByTestId('place-body'), 'layout', {
      nativeEvent: { layout: { y: 272 } },
    })
    await fireEvent(view.getByTestId('place-content'), 'layout', {
      nativeEvent: { layout: { y: 900 } },
    })
    expect(scrollTo).toHaveBeenCalledWith({ y: 272 + 900 - 16, animated: true })
  })

  it('says once what following gives (A27)', async () => {
    session.useSession.mockReturnValue({ status: 'authenticated' })
    const view = await render(<EstablishmentScreen />)
    await fireEvent.press(view.getByRole('button', { name: 'Seguir Café da Praça' }))
    expect(mockToggle).toHaveBeenCalledWith(true)
    expect(
      view.getByText('Você segue este lugar. Ele fica na sua lista Seguindo, em Conta.')
    ).toBeOnTheScreen()
    expect(hint.markFollowExplained).toHaveBeenCalled()

    // Another place, another visit: already said, so not said again.
    await view.unmount()
    hint.followExplained.mockReturnValue(true)
    const again = await render(<EstablishmentScreen />)
    await fireEvent.press(again.getByRole('button', { name: 'Seguir Café da Praça' }))
    expect(mockToggle).toHaveBeenCalledTimes(2)
    expect(
      again.queryByText('Você segue este lugar. Ele fica na sua lista Seguindo, em Conta.')
    ).toBeNull()
  })
})
