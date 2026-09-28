import { render } from '@testing-library/react-native'

import { GoogleMapRenderer } from '@/maps/google-map'

const mockViews: Record<string, unknown>[] = []
jest.mock('expo-maps', () => {
  const { View } = jest.requireActual('react-native')
  const MapView = (props: Record<string, unknown>) => {
    mockViews.push(props)
    return <View testID="native-map" />
  }
  return { GoogleMaps: { View: MapView }, AppleMaps: { View: MapView } }
})
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))

const forno = {
  slug: 'forno-e-fermento',
  name: 'Forno & Fermento',
  category: 'Padarias',
  latitude: -23.29,
  longitude: -51.17,
}
const pins = [forno]

const renderer = (center: { latitude: number; longitude: number }) => (
  <GoogleMapRenderer pins={pins} center={center} onSelect={jest.fn()} onOpen={jest.fn()} />
)

beforeEach(() => {
  mockViews.length = 0
})

// The native view recentres on each new camera position it is handed.
it('keeps the camera where the person left it when the screen redraws', async () => {
  const view = await render(renderer({ latitude: -23.31, longitude: -51.16 }))
  // Explorar hands a new object with the same city on every render.
  await view.rerender(renderer({ latitude: -23.31, longitude: -51.16 }))

  const [first, second] = mockViews
  expect(second.cameraPosition).toBe(first.cameraPosition)
  expect(second.markers).toBe(first.markers)
  expect(first.cameraPosition).toEqual({
    coordinates: { latitude: -23.31, longitude: -51.16 },
    zoom: 12,
  })
})

it('moves the camera when the city itself changes', async () => {
  const view = await render(renderer({ latitude: -23.31, longitude: -51.16 }))
  await view.rerender(renderer({ latitude: -23.42, longitude: -51.93 }))

  const [first, second] = mockViews
  expect(second.cameraPosition).not.toBe(first.cameraPosition)
  expect(second.cameraPosition).toMatchObject({
    coordinates: { latitude: -23.42, longitude: -51.93 },
  })
})
