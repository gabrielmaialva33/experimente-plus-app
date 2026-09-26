import { fireEvent, render } from '@testing-library/react-native'

import { MapLibreRenderer } from '@/maps/maplibre-map'

jest.mock('@maplibre/maplibre-react-native', () => {
  const { Pressable, View } = jest.requireActual('react-native')
  return {
    Map: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    Camera: () => null,
    Marker: ({ children, onPress, id }: { children: React.ReactNode; onPress: () => void; id: string }) => (
      <Pressable testID={`marker-${id}`} onPress={onPress}>{children}</Pressable>
    ),
  }
})
jest.mock('@/maps/attribution', () => ({ useMapCredit: () => '© OpenStreetMap' }))
jest.mock('@/theme/use-colors', () => ({ useColors: () => jest.requireActual('@/theme/tokens').palette.light }))

const pins = [
  { slug: 'casa-de-petiscos', name: 'Casa de Petiscos', category: 'Bares', latitude: -23.3103, longitude: -51.1628 },
  { slug: 'atelie-do-cafe', name: 'Ateliê do Café', category: 'Cafés', latitude: -23.3103, longitude: -51.1628 },
]

it('opens exactly the place picked from a spot that holds several', async () => {
  const onSelect = jest.fn()
  const view = await render(
    <MapLibreRenderer pins={pins} center={{ latitude: -23.31, longitude: -51.16 }} onSelect={onSelect} />
  )

  expect(view.getAllByTestId(/^marker-/)).toHaveLength(1)
  await fireEvent.press(view.getByText('2 lugares aqui'))
  expect(onSelect).not.toHaveBeenCalled()

  await fireEvent.press(view.getByRole('button', { name: 'Casa de Petiscos, Bares' }))
  expect(onSelect).toHaveBeenCalledTimes(1)
  expect(onSelect).toHaveBeenCalledWith('casa-de-petiscos')
})

it('opens a lone place straight from its marker', async () => {
  const onSelect = jest.fn()
  const view = await render(
    <MapLibreRenderer pins={[pins[1]]} center={{ latitude: -23.31, longitude: -51.16 }} onSelect={onSelect} />
  )

  await fireEvent.press(view.getByText('Ateliê do Café'))
  expect(onSelect).toHaveBeenCalledWith('atelie-do-cafe')
})
