import { fireEvent, render } from '@testing-library/react-native'
import * as WebBrowser from 'expo-web-browser'

import { apiBaseUrl } from '@/api/config'
import type { EstablishmentSummary } from '@/catalog/types'
import { EstablishmentMap } from '@/components/establishment-map'
import { minTouch } from '@/theme/tokens'
import type { MapRendererProps } from '@/maps/types'

jest.mock('@/maps/config', () => ({ usesGoogleMaps: false, mapStyleUrl: 'https://example.test' }))
jest.mock('@/maps/google-map', () => ({ GoogleMapRenderer: () => null }))
// The renderer's own behaviour has its tests; here it only reports what it was handed.
jest.mock('@/maps/maplibre-map', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native')
  return {
    MapLibreRenderer: (props: MapRendererProps) => (
      <View>
        <Text testID="held">{props.selected ?? 'none'}</Text>
        {props.pins.map((pin) => (
          <Pressable
            key={pin.slug}
            testID={`mark-${pin.slug}`}
            onPress={() => props.onSelect(pin.slug)}
          />
        ))}
        <Pressable testID="map-background" onPress={props.onBackgroundPress} />
      </View>
    ),
  }
})
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(async () => ({ type: 'opened' })),
}))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))

const place = (slug: string, name: string, district: string): EstablishmentSummary => ({
  slug,
  name,
  short_description: null,
  city: { slug: 'londrina', name: 'Londrina', state_code: 'PR' },
  address: { district, latitude: -23.31, longitude: -51.16 },
  business_status: 'open',
  is_open_now: true,
  primary_category: { name: 'Cafés' } as EstablishmentSummary['primary_category'],
  categories: [],
  cover: null as unknown as EstablishmentSummary['cover'],
  is_sponsored: false,
  reviews: { count: 2, average: 4.5 },
  published_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
})

const cafe = place('cafe-da-praca', 'Café da Praça', 'Centro')
const forno = place('forno', 'Forno & Fermento', 'Gleba Palhano')

it('holds a place tapped on the map in a card, and opens it only from the card', async () => {
  const onSelect = jest.fn()
  const view = await render(<EstablishmentMap establishments={[cafe, forno]} onSelect={onSelect} />)
  expect(view.queryByTestId('map-preview-forno')).toBeNull()

  await fireEvent.press(view.getByTestId('mark-forno'))

  expect(view.getByTestId('held')).toHaveTextContent('forno')
  expect(view.getByText('Forno & Fermento')).toBeOnTheScreen()
  expect(view.getByText('Cafés · 4,5 ★ (2) · Gleba Palhano')).toBeOnTheScreen()
  expect(onSelect).not.toHaveBeenCalled()

  await fireEvent.press(view.getByRole('button', { name: /^Forno & Fermento, Aberto agora/ }))
  expect(onSelect).toHaveBeenCalledWith('forno')
})

it('swaps the card for the next place tapped', async () => {
  const view = await render(
    <EstablishmentMap establishments={[cafe, forno]} onSelect={jest.fn()} />
  )

  await fireEvent.press(view.getByTestId('mark-forno'))
  await fireEvent.press(view.getByTestId('mark-cafe-da-praca'))

  expect(view.queryByTestId('map-preview-forno')).toBeNull()
  expect(view.getByTestId('map-preview-cafe-da-praca')).toBeOnTheScreen()
})

it.each([
  [
    'its close button',
    (view: Awaited<ReturnType<typeof render>>) => view.getByRole('button', { name: 'Fechar' }),
  ],
  [
    'a tap on the map away from the marks',
    (view: Awaited<ReturnType<typeof render>>) => view.getByTestId('map-background'),
  ],
])('lets go of the place with %s', async (_, target) => {
  const view = await render(
    <EstablishmentMap establishments={[cafe, forno]} onSelect={jest.fn()} />
  )
  await fireEvent.press(view.getByTestId('mark-forno'))

  await fireEvent.press(target(view))

  expect(view.queryByTestId('map-preview-forno')).toBeNull()
  expect(view.getByTestId('held')).toHaveTextContent('none')
})

it('drops the card when a new filter takes its place off the map', async () => {
  const view = await render(
    <EstablishmentMap establishments={[cafe, forno]} onSelect={jest.fn()} />
  )
  await fireEvent.press(view.getByTestId('mark-forno'))

  await view.rerender(<EstablishmentMap establishments={[cafe]} onSelect={jest.fn()} />)

  expect(view.queryByTestId('map-preview-forno')).toBeNull()
  expect(view.getByTestId('held')).toHaveTextContent('none')
})

// A visitor on the map reaches its manual section from the map itself, not from Explorar's band.
it('opens the manual on the map from a 44 circle over it, holding nothing', async () => {
  const onSelect = jest.fn()
  const view = await render(<EstablishmentMap establishments={[cafe, forno]} onSelect={onSelect} />)

  const help = view.getByRole('link', { name: 'Abrir o manual: como usar o mapa' })
  expect(help).toHaveStyle({ width: minTouch, height: minTouch, backgroundColor: '#ffffff' })
  await fireEvent.press(help)

  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
    `${apiBaseUrl}/manual#app-mapa`,
    expect.any(Object)
  )
  expect(view.getByTestId('held')).toHaveTextContent('none')
  expect(onSelect).not.toHaveBeenCalled()
})

it('leaves the help off a map with no place to show', async () => {
  const view = await render(
    <EstablishmentMap
      establishments={[
        { ...cafe, address: { district: 'Centro', latitude: null, longitude: null } },
      ]}
      onSelect={jest.fn()}
    />
  )
  expect(view.getByText('Nenhum lugar com localização para mostrar no mapa.')).toBeOnTheScreen()
  expect(view.queryByRole('link')).toBeNull()
})
