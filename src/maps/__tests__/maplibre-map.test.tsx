import { act, fireEvent, render } from '@testing-library/react-native'

import { MapLibreRenderer } from '@/maps/maplibre-map'
import { palette } from '@/theme/tokens'

/**
 * The native map draws the marks itself; the mock keeps what matters here: the
 * data and layers handed to it, the press it reports and the source and camera
 * calls a press leads to.
 */
const mockSource = {
  getClusterExpansionZoom: jest.fn(),
  getClusterLeaves: jest.fn(),
}
const mockCamera = { easeTo: jest.fn() }
const mockMap = { getZoom: jest.fn() }
const mockLayers: Record<string, Record<string, unknown>> = {}
type MockProps = { children?: React.ReactNode; ref?: React.Ref<unknown> } & Record<string, unknown>

jest.mock('@maplibre/maplibre-react-native', () => {
  const { useImperativeHandle } = jest.requireActual('react')
  const { View } = jest.requireActual('react-native')
  return {
    Map: ({ children, ref, ...props }: MockProps) => {
      useImperativeHandle(ref, () => mockMap)
      return (
        <View testID="native-map" {...props}>
          {children}
        </View>
      )
    },
    Camera: ({ ref }: MockProps) => {
      useImperativeHandle(ref, () => mockCamera)
      return null
    },
    Images: () => null,
    GeoJSONSource: ({ children, ref, ...props }: MockProps) => {
      useImperativeHandle(ref, () => mockSource)
      return (
        <View testID="places-source" {...props}>
          {children}
        </View>
      )
    },
    Layer: (props: MockProps) => {
      mockLayers[props.id as string] = props
      return null
    },
  }
})
jest.mock('@/maps/basemap', () => ({
  useBasemap: () => ({ credit: '© OpenStreetMap', textFont: ['Noto Sans Medium'] }),
}))
jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))

const theme = jest.requireMock('@/theme/use-colors') as { useColors: jest.Mock }

const casa = {
  slug: 'casa-de-petiscos',
  name: 'Casa de Petiscos',
  category: 'Bares',
  latitude: -23.3103,
  longitude: -51.1628,
}
// The same building as Casa de Petiscos.
const atelie = { ...casa, slug: 'atelie-do-cafe', name: 'Ateliê do Café', category: 'Cafés' }
// Across town.
const forno = {
  slug: 'forno-e-fermento',
  name: 'Forno & Fermento',
  category: 'Padarias',
  latitude: -23.29,
  longitude: -51.17,
}

const center = { latitude: -23.31, longitude: -51.16 }

const point = (longitude: number, latitude: number) => ({
  type: 'Point',
  coordinates: [longitude, latitude],
})

/**
 * What the native source reports for a press on its marks. Like the native
 * event, it bubbles on to the map's own press unless stopped.
 */
const press = async (
  view: Awaited<ReturnType<typeof render>>,
  features: unknown[],
  lngLat: [number, number]
) =>
  act(async () => {
    let stopped = false
    const event = { nativeEvent: { features, lngLat }, stopPropagation: () => (stopped = true) }
    view.getByTestId('places-source').props.onPress(event)
    if (!stopped) view.getByTestId('native-map').props.onPress?.(event)
  })

beforeEach(() => {
  jest.clearAllMocks()
  theme.useColors.mockReturnValue(palette.light)
  for (const id of Object.keys(mockLayers)) delete mockLayers[id]
})

it('hands the map one point per spot, clustered by the places each stands for', async () => {
  const view = await render(
    <MapLibreRenderer
      pins={[casa, atelie, forno]}
      center={center}
      onSelect={jest.fn()}
      onOpen={jest.fn()}
    />
  )
  const source = view.getByTestId('places-source')

  expect(source.props.data.features).toEqual([
    {
      type: 'Feature',
      geometry: point(casa.longitude, casa.latitude),
      properties: { key: 'casa-de-petiscos', name: '2 lugares aqui', places: 2, rank: 0 },
    },
    {
      type: 'Feature',
      geometry: point(forno.longitude, forno.latitude),
      properties: { key: 'forno-e-fermento', name: 'Forno & Fermento', places: 1, rank: 1 },
    },
  ])
  expect(source.props).toMatchObject({
    cluster: true,
    clusterProperties: { places: ['+', ['get', 'places']] },
  })
  // Lone places carry their name; clusters and shared spots carry a count.
  expect(mockLayers.places.filter).toEqual(['==', ['get', 'places'], 1])
  expect(mockLayers['place-clusters'].filter).toEqual(['>', ['get', 'places'], 1])
  expect(mockLayers.places.layout).toMatchObject({
    'text-field': ['get', 'name'],
    'text-font': ['Noto Sans Medium'],
    'text-optional': true,
  })
})

// The basemap is light in either theme, so the marks keep the navy of navigation.
it.each(['light', 'dark'] as const)('draws the marks in navy on the %s theme', async (mode) => {
  theme.useColors.mockReturnValue(palette[mode])
  await render(
    <MapLibreRenderer pins={[forno]} center={center} onSelect={jest.fn()} onOpen={jest.fn()} />
  )

  expect(mockLayers.places.paint).toMatchObject({
    'icon-color': palette.light.primary,
    'text-color': palette.light.primary,
    'text-halo-color': '#ffffff',
  })
  expect(mockLayers['place-clusters'].paint).toMatchObject({
    'icon-color': palette.light.primary,
    'text-color': '#ffffff',
  })
})

it('picks a lone place from its mark, without leaving the map', async () => {
  const onSelect = jest.fn()
  const onOpen = jest.fn()
  const view = await render(
    <MapLibreRenderer
      pins={[casa, atelie, forno]}
      center={center}
      onSelect={onSelect}
      onOpen={onOpen}
    />
  )

  // The finger lands on Forno's label, which also reaches the shared spot's bubble.
  await press(
    view,
    [
      { geometry: point(casa.longitude, casa.latitude), properties: { key: 'casa-de-petiscos' } },
      { geometry: point(forno.longitude, forno.latitude), properties: { key: 'forno-e-fermento' } },
    ],
    [-51.1701, -23.2902]
  )

  expect(onSelect).toHaveBeenCalledTimes(1)
  expect(onSelect).toHaveBeenCalledWith('forno-e-fermento')
  expect(onOpen).not.toHaveBeenCalled()
  expect(mockCamera.easeTo).not.toHaveBeenCalled()
})

it('opens exactly the place picked from a spot that holds several', async () => {
  const onSelect = jest.fn()
  const onOpen = jest.fn()
  const view = await render(
    <MapLibreRenderer pins={[casa, atelie]} center={center} onSelect={onSelect} onOpen={onOpen} />
  )

  await press(
    view,
    [{ geometry: point(casa.longitude, casa.latitude), properties: { key: 'casa-de-petiscos' } }],
    [casa.longitude, casa.latitude]
  )
  expect(onSelect).not.toHaveBeenCalled()
  expect(view.getByText('2 lugares aqui')).toBeOnTheScreen()

  // Choosing from the list is already a decision: it goes straight to the page.
  await fireEvent.press(view.getByRole('button', { name: 'Casa de Petiscos, Bares' }))
  expect(onOpen).toHaveBeenCalledTimes(1)
  expect(onOpen).toHaveBeenCalledWith('casa-de-petiscos')
  expect(onSelect).not.toHaveBeenCalled()
})

it('closes the list when the map around it is tapped', async () => {
  const view = await render(
    <MapLibreRenderer
      pins={[casa, atelie]}
      center={center}
      onSelect={jest.fn()}
      onOpen={jest.fn()}
    />
  )
  await press(
    view,
    [{ geometry: point(casa.longitude, casa.latitude), properties: { key: 'casa-de-petiscos' } }],
    [casa.longitude, casa.latitude]
  )
  expect(view.getByText('2 lugares aqui')).toBeOnTheScreen()

  await act(async () => view.getByTestId('native-map').props.onPress())
  expect(view.queryByText('2 lugares aqui')).toBeNull()
})

it('zooms into a cluster until it splits', async () => {
  mockSource.getClusterExpansionZoom.mockResolvedValue(13)
  mockMap.getZoom.mockResolvedValue(11)
  const onSelect = jest.fn()
  const view = await render(
    <MapLibreRenderer pins={[casa, forno]} center={center} onSelect={onSelect} onOpen={jest.fn()} />
  )

  await press(
    view,
    [{ geometry: point(-51.166, -23.3), properties: { cluster: true, cluster_id: 7, places: 2 } }],
    [-51.166, -23.3]
  )

  expect(mockSource.getClusterExpansionZoom).toHaveBeenCalledWith(7)
  expect(mockCamera.easeTo).toHaveBeenCalledWith(
    expect.objectContaining({ center: [-51.166, -23.3], zoom: 13 })
  )
  expect(onSelect).not.toHaveBeenCalled()
  expect(view.queryByText('2 lugares aqui')).toBeNull()
})

it('lists the places of a cluster that cannot split any further', async () => {
  mockSource.getClusterExpansionZoom.mockResolvedValue(16)
  mockMap.getZoom.mockResolvedValue(16)
  mockSource.getClusterLeaves.mockResolvedValue([
    { properties: { key: 'casa-de-petiscos', places: 2 } },
    { properties: { key: 'forno-e-fermento', places: 1 } },
  ])
  const onOpen = jest.fn()
  const view = await render(
    <MapLibreRenderer
      pins={[casa, atelie, forno]}
      center={center}
      onSelect={jest.fn()}
      onOpen={onOpen}
    />
  )

  await press(
    view,
    [{ geometry: point(-51.166, -23.3), properties: { cluster: true, cluster_id: 3, places: 3 } }],
    [-51.166, -23.3]
  )

  expect(mockCamera.easeTo).not.toHaveBeenCalled()
  expect(view.getByText('3 lugares aqui')).toBeOnTheScreen()
  await fireEvent.press(view.getByRole('button', { name: 'Forno & Fermento, Padarias' }))
  expect(onOpen).toHaveBeenCalledWith('forno-e-fermento')
})

it('ignores a press that reaches no mark of its own', async () => {
  const onSelect = jest.fn()
  const view = await render(
    <MapLibreRenderer pins={[forno]} center={center} onSelect={onSelect} onOpen={jest.fn()} />
  )

  await press(
    view,
    [{ geometry: point(-51.2, -23.3), properties: { key: 'gone' } }],
    [-51.2, -23.3]
  )

  expect(onSelect).not.toHaveBeenCalled()
  expect(mockCamera.easeTo).not.toHaveBeenCalled()
})

// The marks are the map's own drawing, out of a screen reader's reach; the list is the way.
it('names the map and leads a screen reader to the list of the same places', async () => {
  const onShowList = jest.fn()
  const view = await render(
    <MapLibreRenderer
      pins={[casa, atelie, forno]}
      center={center}
      onSelect={jest.fn()}
      onOpen={jest.fn()}
      onShowList={onShowList}
    />
  )

  const map = view.getByRole('button', { name: 'Mapa com 3 lugares' })
  expect(map.props.accessible).toBe(true)
  expect(map.props.accessibilityHint).toBe('Os mesmos lugares estão na lista.')
  expect(map.props.accessibilityActions).toEqual([{ name: 'activate', label: 'Ver em lista' }])

  await fireEvent(map, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } })
  expect(onShowList).toHaveBeenCalledTimes(1)
})

it('draws the held place larger and names it ahead of the others', async () => {
  await render(
    <MapLibreRenderer
      pins={[casa, atelie, forno]}
      center={center}
      onSelect={jest.fn()}
      onOpen={jest.fn()}
      selected="forno-e-fermento"
    />
  )

  const held = ['==', ['get', 'key'], 'forno-e-fermento']
  expect(mockLayers.places.layout).toMatchObject({
    'icon-size': ['case', held, 0.8, 0.5],
    'symbol-sort-key': ['case', held, -1, ['get', 'rank']],
  })
})

it('lets go of the held place when the map away from the marks is tapped', async () => {
  const onBackgroundPress = jest.fn()
  const view = await render(
    <MapLibreRenderer
      pins={[forno]}
      center={center}
      onSelect={jest.fn()}
      onOpen={jest.fn()}
      onBackgroundPress={onBackgroundPress}
    />
  )

  await act(async () => view.getByTestId('native-map').props.onPress())
  expect(onBackgroundPress).toHaveBeenCalledTimes(1)
})

it('offers to bring the city back once the person moves the map', async () => {
  const view = await render(
    <MapLibreRenderer pins={[forno]} center={center} onSelect={jest.fn()} onOpen={jest.fn()} />
  )
  expect(view.queryByTestId('map-recentre')).toBeNull()

  // The map's own moves (a cluster opening) do not count as the person's.
  await act(async () =>
    view
      .getByTestId('native-map')
      .props.onRegionDidChange({ nativeEvent: { userInteraction: false } })
  )
  expect(view.queryByTestId('map-recentre')).toBeNull()

  await act(async () =>
    view
      .getByTestId('native-map')
      .props.onRegionDidChange({ nativeEvent: { userInteraction: true } })
  )
  await fireEvent.press(view.getByRole('button', { name: 'Centralizar o mapa na cidade' }))

  expect(mockCamera.easeTo).toHaveBeenCalledWith(
    expect.objectContaining({ center: [center.longitude, center.latitude], zoom: 11 })
  )
  expect(view.queryByTestId('map-recentre')).toBeNull()
})
