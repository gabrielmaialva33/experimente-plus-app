import { act, fireEvent, render } from '@testing-library/react-native'
import { Linking } from 'react-native'

import EstablishmentScreen from '@/app/estabelecimento/[city]/[slug]'
import type { EstablishmentDetail, EstablishmentSummary } from '@/catalog/types'
import { EstablishmentCard } from '@/components/establishment-card'
import { EstablishmentCover } from '@/components/establishment-cover'
import { EstablishmentHours } from '@/components/establishment-hours'
import { OperatingStatus } from '@/components/operating-status'
import { palette } from '@/theme/tokens'

jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ city: 'londrina', slug: 'cafe' }) }))
jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').View }))
jest.mock('@/analytics/events', () => ({ track: jest.fn() }))
jest.mock('@/catalog/queries', () => ({ useEstablishment: jest.fn() }))
jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))

const queries = jest.requireMock('@/catalog/queries') as { useEstablishment: jest.Mock }
const theme = jest.requireMock('@/theme/use-colors') as { useColors: jest.Mock }

const detail: EstablishmentDetail = {
  slug: 'cafe', name: 'Café da Praça', short_description: null, description: null,
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
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('establishment presentation', () => {
  it.each(['light', 'dark'] as const)('gives directions the only CTA and keeps contacts secondary in %s', async (mode) => {
    theme.useColors.mockReturnValue(palette[mode])
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    const view = await render(<EstablishmentScreen />)

    const route = view.getByRole('button', { name: 'Como chegar' })
    expect(route).toHaveStyle({ backgroundColor: palette[mode].cta })
    for (const label of ['WhatsApp', 'Ligar', 'Site']) {
      expect(view.getByRole('button', { name: label })).toHaveStyle({ backgroundColor: palette[mode].card })
      expect(view.getByText(label)).toHaveStyle({ color: palette[mode].primary })
    }
    await fireEvent.press(route)
    expect(openURL).toHaveBeenCalledWith('https://www.google.com/maps/dir/?api=1&destination=-23.31,-51.16')
    expect(view.getByText('Fechado agora')).toBeOnTheScreen()
  })

  it('promotes an existing contact when coordinates are absent', async () => {
    queries.useEstablishment.mockReturnValue({ data: {
      ...detail, address: { ...detail.address, latitude: null, longitude: null },
    } })
    const view = await render(<EstablishmentScreen />)
    expect(view.queryByRole('button', { name: 'Como chegar' })).toBeNull()
    expect(view.getByRole('button', { name: 'WhatsApp' })).toHaveStyle({ backgroundColor: palette.light.cta })
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
    expect(view.getByText('Domingo · Hoje')).toHaveStyle({ fontWeight: '700' })
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
      light: { warning: 'rgba(220, 143, 9, 0.3)', info: 'rgba(16, 120, 158, 0.25)', success: 'rgba(27, 126, 70, 0.25)' },
      dark: { warning: 'rgba(244, 170, 42, 0.3)', info: 'rgba(67, 193, 239, 0.25)', success: 'rgba(47, 198, 110, 0.25)' },
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
