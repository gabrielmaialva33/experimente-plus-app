import { act, fireEvent, render } from '@testing-library/react-native'
import { Linking, ScrollView, StyleSheet } from 'react-native'

import EstablishmentScreen from '@/app/estabelecimento/[city]/[slug]'
import type { EstablishmentDetail, EstablishmentSummary } from '@/catalog/types'
import { EstablishmentCard } from '@/components/establishment-card'
import { EstablishmentCover } from '@/components/establishment-cover'
import { EstablishmentHours } from '@/components/establishment-hours'
import { OperatingStatus } from '@/components/operating-status'
import { palette, fontFamilies } from '@/theme/tokens'

const mockRouter = { push: jest.fn(), back: jest.fn() }
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: jest.fn(() => null) },
}))
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 0, left: 0 }) }))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').View }))
jest.mock('@/analytics/events', () => ({ track: jest.fn() }))
jest.mock('@/api/client', () => ({ ApiError: class ApiError extends Error {} }))
jest.mock('@/purchases/queries', () => ({ usePurchaseEditions: jest.fn() }))
jest.mock('@/catalog/queries', () => ({ useEstablishment: jest.fn() }))
jest.mock('@/session/context', () => ({ useSession: jest.fn() }))
jest.mock('@/reviews/queries', () => ({ useEstablishmentReviews: () => ({ data: undefined, isError: false }) }))
const mockToggle = jest.fn()
jest.mock('@/explorer/queries', () => ({
  useSavedStatus: () => ({ data: undefined }),
  useToggleSaved: () => ({ mutate: mockToggle, isPending: false }),
  useSavedContent: () => ({ data: undefined }),
  useToggleSavedContent: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock('@/partner-content/queries', () => ({ usePartnerContent: jest.fn() }))
jest.mock('@/place/follow-hint', () => ({ followExplained: jest.fn(), markFollowExplained: jest.fn() }))
jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))

const queries = jest.requireMock('@/catalog/queries') as { useEstablishment: jest.Mock }
const theme = jest.requireMock('@/theme/use-colors') as { useColors: jest.Mock }
const router = jest.requireMock('expo-router') as { useLocalSearchParams: jest.Mock; Stack: { Screen: jest.Mock } }
const session = jest.requireMock('@/session/context') as { useSession: jest.Mock }
const purchases = jest.requireMock('@/purchases/queries') as { usePurchaseEditions: jest.Mock }
const content = jest.requireMock('@/partner-content/queries') as { usePartnerContent: jest.Mock }
const hint = jest.requireMock('@/place/follow-hint') as { followExplained: jest.Mock; markFollowExplained: jest.Mock }

const detail: EstablishmentDetail = {
  id: 1, slug: 'cafe', name: 'Café da Praça', short_description: null, description: null,
  reviews: { count: 0, average: null },
  city: { slug: 'londrina', name: 'Londrina', state_code: 'PR', timezone: 'America/Sao_Paulo' },
  address: {
    postal_code: null, street: 'Rua Central', number: '10', without_number: false,
    complement: null, district: 'Centro', reference: null, latitude: -23.31, longitude: -51.16,
  },
  contacts: {
    phone: '43999999999', whatsapp: '43999999999', email: null,
    website: 'https://example.com', instagram: null, booking_url: null,
  },
  business_status: 'open', availability_type: 'regular_hours', is_open_now: false,
  categories: [], attributes: [],
  opening_hours: {
    weekly: [
      { weekday: 1, opens_at: '09:00:00', closes_at: '18:00:00', spans_next_day: false, sort_order: 0 },
    ],
    special_days: [],
  },
  media: [],
  cover: {
    purpose: 'cover', is_cover: true, sort_order: 0, alt_text: 'Fachada do café', caption: null,
    asset: { url: 'https://example.com/cover.jpg', mime_type: 'image/jpeg', file_extension: 'jpg', width: 800, height: 600 },
  },
  is_sponsored: false, published_at: '', updated_at: '',
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
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('establishment presentation', () => {
  // Direction A (audit A11): orange is kept for the benefit, so the route is the
  // page's navy main action, and contacts are rows of the practical block.
  it.each(['light', 'dark'] as const)('gives directions the navy main action and lists contacts as rows in %s', async (mode) => {
    theme.useColors.mockReturnValue(palette[mode])
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    const view = await render(<EstablishmentScreen />)

    const route = view.getByRole('button', { name: 'Como chegar' })
    expect(route).toHaveStyle({ backgroundColor: palette[mode].primary })
    for (const label of ['WhatsApp', 'Ligar', 'Site']) {
      expect(view.getByRole('button', { name: label })).toHaveStyle({ backgroundColor: palette[mode].card, minHeight: 56 })
      expect(view.getByText(label)).toHaveStyle({ color: palette[mode].foreground })
    }
    await fireEvent.press(route)
    expect(openURL).toHaveBeenCalledWith('https://www.google.com/maps/dir/?api=1&destination=-23.31,-51.16')
    expect(view.getByText('Fechado agora')).toBeOnTheScreen()
  })

  it.each(['light', 'dark'] as const)('never sinks interactive contacts below their supporting plane in %s', async (mode) => {
    theme.useColors.mockReturnValue(palette[mode])
    const view = await render(<EstablishmentScreen />)
    const levels = [palette[mode].surfaceBase, palette[mode].surfaceRaised, palette[mode].surfaceOverlay] as readonly string[]
    for (const name of ['WhatsApp', 'Ligar', 'Site']) {
      const button = view.getByRole('button', { name })
      const background = StyleSheet.flatten(button.props.style).backgroundColor
      let parent = button.parent
      while (parent && !StyleSheet.flatten(parent.props.style)?.backgroundColor) parent = parent.parent
      const support = StyleSheet.flatten(parent?.props.style)?.backgroundColor
      expect(levels.indexOf(support)).toBeGreaterThanOrEqual(0)
      expect(levels.indexOf(background)).toBeGreaterThanOrEqual(levels.indexOf(support))
      expect(background).not.toBe(palette[mode].cta)
    }
  })

  it('promotes an existing contact when coordinates are absent', async () => {
    queries.useEstablishment.mockReturnValue({ data: {
      ...detail, address: { ...detail.address, latitude: null, longitude: null },
    } })
    const view = await render(<EstablishmentScreen />)
    expect(view.queryByRole('button', { name: 'Como chegar' })).toBeNull()
    expect(view.getAllByRole('button', { name: 'WhatsApp' })).toHaveLength(1)
    expect(view.getByRole('button', { name: 'WhatsApp' })).toHaveStyle({ backgroundColor: palette.light.primary })
  })

  it('offers the e-mail and the Instagram a place publishes', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    queries.useEstablishment.mockReturnValue({ data: {
      ...detail, contacts: { ...detail.contacts, email: 'contato@cafe.com.br', instagram: '@cafedapraca' },
    } })
    const view = await render(<EstablishmentScreen />)

    await fireEvent.press(view.getByRole('button', { name: 'E-mail' }))
    expect(openURL).toHaveBeenLastCalledWith('mailto:contato@cafe.com.br')
    await fireEvent.press(view.getByRole('button', { name: 'Instagram' }))
    expect(openURL).toHaveBeenLastCalledWith('https://instagram.com/cafedapraca')
    expect(view.queryByText('Sem contato cadastrado')).toBeNull()
  })

  it('says so when a place has no way to be reached, instead of leaving the space empty', async () => {
    queries.useEstablishment.mockReturnValue({ data: {
      ...detail,
      contacts: { phone: null, whatsapp: null, email: null, website: null, instagram: null, booking_url: null },
    } })
    const view = await render(<EstablishmentScreen />)

    expect(view.getByRole('button', { name: 'Como chegar' })).toBeOnTheScreen()
    expect(view.getByText('Sem contato cadastrado')).toBeOnTheScreen()
  })

  it('shows a temporary closure in both the detail and list card', async () => {
    const closed = { ...detail, business_status: 'temporarily_closed' as const }
    queries.useEstablishment.mockReturnValue({ data: closed })
    const summary: EstablishmentSummary = { ...closed, primary_category: null }
    const view = await render(<>
      <EstablishmentScreen />
      <EstablishmentCard establishment={summary} onPress={jest.fn()} />
    </>)
    expect(view.getAllByText('Fechado temporariamente')).toHaveLength(2)
  })

  it.each(['regular_hours', 'appointment_only'] as const)(
    'keeps a false search result generic while the detail can explain %s', async (availability_type) => {
      const { availability_type: _availability, ...searchFields } = detail
      const summary: EstablishmentSummary = { ...searchFields, primary_category: null }
      const view = await render(<EstablishmentCard establishment={summary} onPress={jest.fn()} />)
      expect(view.getByText('Consulte o atendimento')).toBeOnTheScreen()
      expect(view.queryByText('Fechado agora')).toBeNull()
      expect(view.queryByText('Somente com agendamento')).toBeNull()

      queries.useEstablishment.mockReturnValue({ data: { ...detail, availability_type } })
      await view.rerender(<EstablishmentScreen />)
      expect(view.queryByText('Consulte o atendimento')).toBeNull()
      expect(view.getAllByText(
        availability_type === 'appointment_only' ? 'Somente com agendamento' : 'Fechado agora'
      ).length).toBeGreaterThan(0)
    }
  )

  it('highlights the city day, shows closed days and updates across local midnight', async () => {
    jest.useFakeTimers({ now: new Date('2026-09-07T02:59:30Z') })
    const view = await render(<EstablishmentHours establishment={detail} />)
    expect(view.getByText('Domingo · Hoje')).toHaveStyle({ fontFamily: fontFamilies.text[700] })
    expect(view.getAllByText('Fechado')).toHaveLength(6)
    expect(view.getByText('09:00 às 18:00')).toBeOnTheScreen()

    await act(async () => { jest.advanceTimersByTime(60_000) })
    expect(view.queryByText('Domingo · Hoje')).toBeNull()
    expect(view.getByText('Segunda · Hoje')).toBeOnTheScreen()
    await view.unmount()
  })

  it('describes appointment-only hours without showing a closed seven-day schedule', async () => {
    const view = await render(<EstablishmentHours establishment={{ ...detail, availability_type: 'appointment_only' }} />)
    expect(view.getByText('Somente com agendamento')).toBeOnTheScreen()
    expect(view.queryByText('Fechado')).toBeNull()
  })

  it('shows habitual 24-hour availability and discloses special-day exceptions', async () => {
    const view = await render(<EstablishmentHours establishment={{
      ...detail, availability_type: 'always_open',
      opening_hours: { weekly: [], special_days: [{ date: '2026-09-07', status: 'closed' }] },
    }} />)
    expect(view.getAllByText('24 horas')).toHaveLength(7)
    expect(view.getByText(/Há horários especiais/)).toBeOnTheScreen()
  })
})

describe.each(['light', 'dark'] as const)('canonical status appearance in %s', (mode) => {
  it.each([
    { business_status: 'permanently_closed', is_open_now: true, availability_type: 'appointment_only', label: 'Encerrado permanentemente', tone: 'muted' },
    { business_status: 'temporarily_closed', is_open_now: true, availability_type: 'appointment_only', label: 'Fechado temporariamente', tone: 'warning' },
    { business_status: 'open', is_open_now: true, availability_type: 'appointment_only', label: 'Somente com agendamento', tone: 'info' },
    { business_status: 'open', is_open_now: true, label: 'Aberto agora', tone: 'success' },
    { business_status: 'open', is_open_now: false, availability_type: 'regular_hours', label: 'Fechado agora', tone: 'muted' },
    { business_status: 'open', is_open_now: false, label: 'Consulte o atendimento', tone: 'muted' },
  ] as const)('$label uses its canonical background, text and border', async ({ label, tone, ...establishment }) => {
    const colors = palette[mode]
    theme.useColors.mockReturnValue(colors)
    const borders = {
      light: { warning: 'rgba(233, 175, 65, 0.3)', info: 'rgba(27, 102, 132, 0.25)', success: 'rgba(17, 115, 66, 0.25)' },
      dark: { warning: 'rgba(246, 185, 81, 0.3)', info: 'rgba(105, 205, 242, 0.25)', success: 'rgba(81, 214, 137, 0.25)' },
    }[mode]
    const expected = {
      muted: { backgroundColor: colors.muted, color: colors.mutedForeground, borderColor: colors.border },
      warning: { backgroundColor: colors.warningSoft, color: colors.warningAccent, borderColor: borders.warning },
      info: { backgroundColor: colors.infoSoft, color: colors.infoAccent, borderColor: borders.info },
      success: { backgroundColor: colors.successSoft, color: colors.successAccent, borderColor: borders.success },
    }[tone]
    const view = await render(<OperatingStatus establishment={establishment} />)
    expect(view.getByTestId('operating-status')).toHaveStyle({
      backgroundColor: expected.backgroundColor, borderColor: expected.borderColor,
    })
    expect(view.getByText(label)).toHaveStyle({ color: expected.color })
  })
})

describe('cover fallback', () => {
  it.each([null, { ...detail.cover, asset: { ...detail.cover.asset, width: 8, height: 6 } }])(
    'does not mount an image for a missing or tiny cover (%p)', async (cover) => {
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

    await view.rerender(<EstablishmentCover cover={{
      ...detail.cover, asset: { ...detail.cover.asset, url: 'https://example.com/new.jpg' },
    }} />)
    expect(view.queryByText('Foto indisponível')).toBeNull()
    expect(view.getByLabelText('Fachada do café')).toBeOnTheScreen()
  })
})

it.each(['light', 'dark'] as const)('keeps missing and tiny photos on absence, never brand or conversion, in %s', async (mode) => {
  theme.useColors.mockReturnValue(palette[mode])
  const view = await render(<EstablishmentCover cover={null} />)
  const label = view.getByText('Foto indisponível')
  expect(label).toHaveStyle({ color: palette[mode].contentAbsentForeground })
  expect(label.parent?.parent).toHaveStyle({ backgroundColor: palette[mode].contentAbsent })
  expect(label.parent?.parent).not.toHaveStyle({ backgroundColor: palette[mode].primary })
  expect(label.parent?.parent).not.toHaveStyle({ backgroundColor: palette[mode].cta })
  await view.rerender(<EstablishmentCover cover={{ ...detail.cover, asset: { ...detail.cover.asset, width: 8, height: 6 } }} detail />)
  expect(view.getByText('Foto indisponível').parent?.parent).toHaveStyle({ backgroundColor: palette[mode].contentAbsent })
})


describe.each(['light', 'dark'] as const)('card cover seam in %s', (mode) => {
  it.each([true, false])('separates the body with a continuous border and inset, with photo=%s', async (photo) => {
    theme.useColors.mockReturnValue(palette[mode])
    const view = await render(<EstablishmentCard
      establishment={{ ...detail, primary_category: null, cover: photo ? detail.cover : {
        ...detail.cover, asset: { ...detail.cover.asset, width: 8, height: 6 },
      } }}
      onPress={jest.fn()}
    />)
    if (photo) expect(view.getByLabelText('Fachada do café')).toBeOnTheScreen()
    else expect(view.getByText('Foto indisponível')).toBeOnTheScreen()
    const body = view.getByText(detail.name).parent!
    expect(body).toHaveStyle({ borderTopWidth: 1, borderTopColor: palette[mode].borderSubtle })
    const inset = StyleSheet.flatten(body.props.style)
    expect(inset.paddingTop).toBeGreaterThan(0)
    expect(inset.paddingHorizontal).toBeGreaterThan(0)
    expect(view.getByRole('button')).toHaveStyle({ overflow: 'hidden' })
  })
})

it.each(['light', 'dark'] as const)('keeps absence, today and neutral status distinct in the rendered surfaces in %s', async (mode) => {
  jest.useFakeTimers({ now: new Date('2026-09-07T16:00:00Z') })
  theme.useColors.mockReturnValue(palette[mode])
  const view = await render(<>
    <EstablishmentCover />
    <EstablishmentHours establishment={detail} />
    <OperatingStatus establishment={detail} />
  </>)
  const absentLabel = view.getByText('Foto indisponível')
  const absent = absentLabel.parent!.parent!
  expect(absent).toHaveStyle({ backgroundColor: palette[mode].contentAbsent })
  expect(absentLabel).toHaveStyle({ color: palette[mode].contentAbsentForeground })
  expect(absentLabel.parent).toHaveStyle({ borderStyle: 'dashed', borderColor: palette[mode].contentAbsentBorder })
  const todayLabel = view.getByText('Segunda · Hoje')
  const today = todayLabel.parent!
  expect(today).toHaveStyle({ backgroundColor: palette[mode].temporalEmphasis, borderLeftWidth: 4, borderLeftColor: palette[mode].temporalEmphasisBorder })
  expect(todayLabel).toHaveStyle({ color: palette[mode].temporalEmphasisForeground })
  const status = view.getByTestId('operating-status')
  expect(status).toHaveStyle({ backgroundColor: palette[mode].statusNeutral, borderStyle: undefined })
  expect(view.getByText('Fechado agora')).toHaveStyle({ color: palette[mode].statusNeutralForeground })
  expect(new Set([absent, today, status].map((node) => StyleSheet.flatten(node.props.style).backgroundColor)).size).toBe(3)
})


it('reserves an initial detail skeleton until the establishment resolves', async () => {
  queries.useEstablishment.mockReturnValue({ isPending: true })
  const view = await render(<EstablishmentScreen />)
  expect(view.getByRole('progressbar', { name: 'Carregando lugar' }).props.accessibilityState).toEqual({ busy: true })
  expect(view.queryByRole('button', { name: 'Como chegar' })).toBeNull()
  queries.useEstablishment.mockReturnValue({ data: detail })
  await view.rerender(<EstablishmentScreen />)
  expect(view.queryByRole('progressbar')).toBeNull()
  expect(view.getByRole('button', { name: 'Como chegar' })).toBeOnTheScreen()
})

describe('place page in direction A', () => {
  const offer = {
    id: 9, edition_id: 5, offer_id: 9, product_type: 'offer', purchasable: true, name: 'Item em dobro',
    amount_cents: 1490, currency: 'BRL', usage_ends_at: '2027-05-09T15:00:00Z',
    city: { slug: 'londrina' }, establishment: { slug: 'cafe' },
    snapshot: { offers: [{ title: 'Item em dobro', description: 'Peça um e ganhe outro igual.' }] },
  }
  const event = (id: number) => ({
    id, kind: 'event', title: `Degustação ${id}`, description: 'Cafés especiais.',
    starts_at: '2026-09-28T19:00:00Z', ends_at: '2026-09-28T21:00:00Z', media: [],
  })
  const week = (weekdays: number[], opens: string, closes: string) => weekdays.map((weekday) => ({
    weekday, opens_at: opens, closes_at: closes, spans_next_day: false, sort_order: 0,
  }))

  it('sells the place’s benefit as a ticket with the page’s one orange action (A11)', async () => {
    purchases.usePurchaseEditions.mockReturnValue({ data: { products: [offer] } })
    const view = await render(<EstablishmentScreen />)

    const cta = view.getByRole('button', { name: /^Ver oferta · Item em dobro · R\$\s14,90$/ })
    expect(cta).toHaveStyle({ backgroundColor: palette.light.cta })
    expect(view.getByText('BENEFÍCIO')).toBeOnTheScreen()
    expect(view.getByText('Peça um e ganhe outro igual. Válido até 09/05/2027.')).toBeOnTheScreen()
    expect(view.getByRole('button', { name: 'Como chegar' })).not.toHaveStyle({ backgroundColor: palette.light.cta })
    await fireEvent.press(cta)
    expect(mockRouter.push).toHaveBeenCalledWith('/compra/5?offerId=9')
  })

  it('reads a uniform week as one line (A9)', async () => {
    queries.useEstablishment.mockReturnValue({ data: {
      ...detail, opening_hours: { weekly: week([0, 1, 2, 3, 4, 5, 6], '08:00:00', '23:00:00'), special_days: [] },
    } })
    const view = await render(<EstablishmentScreen />)
    expect(view.getByText('Todos os dias, 08:00 às 23:00')).toBeOnTheScreen()
    expect(view.queryByRole('button', { name: 'Ver horários da semana' })).toBeNull()
    expect(view.queryByText('Domingo')).toBeNull()
  })

  it('shows today and keeps the grouped week one tap away (A9)', async () => {
    jest.useFakeTimers({ now: new Date('2026-09-07T16:00:00Z') })
    queries.useEstablishment.mockReturnValue({ data: {
      ...detail, opening_hours: { weekly: week([1, 2, 3, 4, 5], '09:00:00', '18:00:00'), special_days: [] },
    } })
    const view = await render(<EstablishmentScreen />)
    expect(view.getByText('Hoje, segunda: 09:00 às 18:00')).toBeOnTheScreen()
    expect(view.queryByText('Sábado e domingo')).toBeNull()

    await fireEvent.press(view.getByRole('button', { name: 'Ver horários da semana' }))
    expect(view.getByText('Segunda a sexta · Hoje')).toBeOnTheScreen()
    expect(view.getByText('Sábado e domingo')).toBeOnTheScreen()
    expect(view.getByTestId('hours-Segunda a sexta')).toHaveStyle({ backgroundColor: palette.light.temporalEmphasis })
    await view.unmount()
  })

  it('names the header after the place and keeps its report in the "⋯" (A32, A40, A43)', async () => {
    const view = await render(<EstablishmentScreen />)
    const calls = router.Stack.Screen.mock.calls
    expect(calls[calls.length - 1][0].options).toEqual({ headerShown: false, title: 'Café da Praça' })

    expect(view.queryByText('Denunciar este lugar')).toBeNull()
    await fireEvent.press(view.getByRole('button', { name: 'Mais opções de Café da Praça' }))
    await fireEvent.press(view.getByText('Denunciar este lugar'))
    expect(mockRouter.push).toHaveBeenCalledWith('/denunciar/establishment/1?nome=Caf%C3%A9%20da%20Pra%C3%A7a')
  })

  it('shows its experiences and events under one title, in cards of one size (A41, A42)', async () => {
    content.usePartnerContent.mockImplementation((_id: number, kind: string) => ({
      data: kind === 'events' ? [event(11)] : [], isPending: false, isError: false,
    }))
    const view = await render(<EstablishmentScreen />)
    expect(view.getByText('Para viver aqui')).toBeOnTheScreen()
    expect(view.queryByText('Descubra mais neste lugar')).toBeNull()
    expect(view.queryByText('Eventos')).toBeNull()
    expect(view.getByTestId('date-tile')).toBeOnTheScreen()

    await fireEvent.press(view.getByRole('button', { name: /^Evento, Degustação 11/ }))
    expect(view.getByText('Cafés especiais.')).toBeOnTheScreen()
  })

  it('opens on the event a link names: marks it and scrolls to it (A14)', async () => {
    router.useLocalSearchParams.mockReturnValue({ city: 'londrina', slug: 'cafe', destaque: 'event-12' })
    content.usePartnerContent.mockImplementation((_id: number, kind: string) => ({
      data: kind === 'events' ? [event(11), event(12)] : [], isPending: false, isError: false,
    }))
    const scrollTo = (ScrollView.prototype as unknown as { scrollTo: jest.Mock }).scrollTo
    const view = await render(<EstablishmentScreen />)

    expect(view.getByTestId('content-event-12')).toHaveStyle({ borderColor: palette.light.primary })
    expect(view.getByTestId('content-event-11')).toHaveStyle({ borderColor: 'transparent' })
    await fireEvent(view.getByTestId('place-body'), 'layout', { nativeEvent: { layout: { y: 272 } } })
    await fireEvent(view.getByTestId('place-content'), 'layout', { nativeEvent: { layout: { y: 900 } } })
    expect(scrollTo).toHaveBeenCalledWith({ y: 272 + 900 - 16, animated: true })
  })

  it('says once what following gives (A27)', async () => {
    session.useSession.mockReturnValue({ status: 'authenticated' })
    const view = await render(<EstablishmentScreen />)
    await fireEvent.press(view.getByRole('button', { name: 'Seguir Café da Praça' }))
    expect(mockToggle).toHaveBeenCalledWith(true)
    expect(view.getByText('Você segue este lugar. Ele fica na sua lista Seguindo, em Conta.')).toBeOnTheScreen()
    expect(hint.markFollowExplained).toHaveBeenCalled()

    // Another place, another visit: already said, so not said again.
    await view.unmount()
    hint.followExplained.mockReturnValue(true)
    const again = await render(<EstablishmentScreen />)
    await fireEvent.press(again.getByRole('button', { name: 'Seguir Café da Praça' }))
    expect(mockToggle).toHaveBeenCalledTimes(2)
    expect(again.queryByText('Você segue este lugar. Ele fica na sua lista Seguindo, em Conta.')).toBeNull()
  })
})
