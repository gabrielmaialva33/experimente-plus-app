import {
  Camera,
  GeoJSONSource,
  Images,
  Layer,
  Map,
  type CameraRef,
  type GeoJSONSourceRef,
  type MapRef,
  type PressEventWithFeatures,
  type SymbolLayerSpecification,
} from '@maplibre/maplibre-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet, Text, View, type NativeSyntheticEvent } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { minTouch, palette, radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { useBasemap } from './basemap'
import { mapStyleUrl } from './config'
import { PinGroupList } from './pin-group-list'
import {
  groupPins,
  liftAboveCard,
  placeFeatures,
  pressedTarget,
  spotOfLeaves,
  type MapPinGroup,
  type MapRendererProps,
  type PressedFeature,
} from './types'

/**
 * The disc every mark is drawn from: a signed distance field (a 16 px radius
 * inside a 48 px square, edge at 3/4 of the alpha range), so one small image
 * scales to a dot or a cluster and takes its colour and ring from the layer.
 */
const images = {
  'map-place': { source: require('@/assets/images/map-place.png'), sdf: true },
}

/**
 * Places closer than this on screen merge into a cluster. From one zoom past the
 * last clustered level every place stands alone: two places a street apart are
 * two marks by then, and the same building is already one spot (`groupPins`).
 */
const CLUSTER_RADIUS = 48
const CLUSTER_MAX_ZOOM = 15

/** A whole city in view, from its centre. */
const INITIAL_ZOOM = 11

/**
 * The basemap is the regional light style in either theme, so the marks keep
 * the light palette too: the navy of navigation with a white ring and halo. The
 * dark theme's primary is a pale blue that would vanish into a light map.
 */
const ink = palette.light.primary
const paper = palette.light.primaryForeground

type SymbolLayout = NonNullable<SymbolLayerSpecification['layout']>

const clusterLayout = (textFont: string[]): SymbolLayout => ({
  'icon-image': 'map-place',
  'icon-size': ['step', ['get', 'places'], 1, 10, 1.2, 50, 1.4],
  'icon-allow-overlap': true,
  'text-field': ['to-string', ['get', 'places']],
  'text-font': textFont,
  'text-size': 14,
  'text-allow-overlap': true,
})

/** The mark a person picked, by its group key; nothing when no place is held. */
const isHeld = (selected: string | null): ['==', ['get', string], string] => [
  '==',
  ['get', 'key'],
  selected ?? '',
]

const placeLayout = (textFont: string[], selected: string | null): SymbolLayout => ({
  'icon-image': 'map-place',
  // The held place grows, so the card at the foot points back at its mark.
  'icon-size': ['case', isHeld(selected), 0.8, 0.5],
  // The dot always shows; the name gives way when it would cover another.
  'icon-allow-overlap': true,
  'text-optional': true,
  'text-field': ['get', 'name'],
  'text-font': textFont,
  'text-size': 13,
  'text-max-width': 10,
  'text-variable-anchor': ['top', 'bottom', 'right', 'left'],
  'text-radial-offset': 0.9,
  'text-justify': 'auto',
  // The held place is placed first, so its name is the one that stays.
  'symbol-sort-key': ['case', isHeld(selected), -1, ['get', 'rank']],
})

/**
 * Open-source renderer, used when no Google Maps key is configured.
 *
 * MapLibre needs no credential of its own — the style does. A Protomaps archive
 * served from the operation's own storage keeps it keyless end to end, since
 * MapLibre Native reads `pmtiles://` sources directly.
 *
 * Places are the map's own layers, not views laid over it: a view marker is a
 * native view the SDK lets draw past the map (it turns clipping off on the map
 * view), so a pan slid the pins over the header, the filters and the tabs, and
 * twenty names stacked in one unreadable pile. Layers are clipped to the map,
 * cluster when they crowd and drop a name that would cover another.
 */
export function MapLibreRenderer({
  pins,
  center,
  onSelect,
  onOpen,
  selected = null,
  onBackgroundPress,
  onShowList,
  coveredBottom = 0,
}: MapRendererProps) {
  const colors = useColors()
  const { credit, textFont } = useBasemap()
  const reduceMotion = useReducedMotion()
  // The map runs under a side cutout in landscape; its own controls stay clear of it.
  const { right: rightInset } = useSafeAreaInsets()
  const groups = useMemo(() => groupPins(pins), [pins])
  const places = useMemo(() => placeFeatures(groups), [groups])
  const [open, setOpen] = useState<MapPinGroup | null>(null)
  const map = useRef<MapRef>(null)
  const camera = useRef<CameraRef>(null)
  const source = useRef<GeoJSONSourceRef>(null)
  // Once the person moves the map away from the city, one tap brings it back.
  const [moved, setMoved] = useState(false)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  // A held place stays in sight: if the card at the foot covers its mark, the
  // map slides it up into the part the card leaves. Once per place picked, the
  // moment its card has a height: a later resize or rotation may find the map
  // under another screen, where the native map answers nothing and logs an error.
  const lifted = useRef<string | null>(null)
  useEffect(() => {
    if (!selected) {
      lifted.current = null
      return
    }
    const pin = pins.find((item) => item.slug === selected)
    if (!pin || !size || coveredBottom <= 0 || lifted.current === selected) return
    lifted.current = selected
    let cancelled = false
    const reveal = async () => {
      try {
        const point = await map.current?.project([pin.longitude, pin.latitude])
        const lift = point ? liftAboveCard(point[1], size.height, coveredBottom) : 0
        if (cancelled || lift === 0) return
        const center = await map.current?.unproject([size.width / 2, size.height / 2 + lift])
        if (!cancelled && center) {
          camera.current?.easeTo({ center, duration: reduceMotion ? 0 : 350 })
        }
      } catch {
        // A map still loading answers nothing; the card stays where it is.
      }
    }
    void reveal()
    return () => {
      cancelled = true
    }
  }, [selected, pins, size, coveredBottom, reduceMotion])
  const recentre = () => {
    setMoved(false)
    camera.current?.easeTo({
      center: [center.longitude, center.latitude],
      zoom: INITIAL_ZOOM,
      duration: reduceMotion ? 0 : 450,
    })
  }

  // A cluster opens at the zoom where it splits; one that cannot split lists its places.
  const expand = async (clusterId: number, point: [number, number]) => {
    try {
      const [zoom, current] = await Promise.all([
        source.current?.getClusterExpansionZoom(clusterId),
        map.current?.getZoom(),
      ])
      if (zoom != null && current != null && zoom > current) {
        camera.current?.easeTo({ center: point, zoom, duration: reduceMotion ? 0 : 450 })
        return
      }
      const leaves = await source.current?.getClusterLeaves(clusterId, 100, 0)
      const spot = leaves ? spotOfLeaves(leaves as PressedFeature[], point, groups) : null
      if (spot) setOpen(spot)
    } catch {
      // A source still loading answers nothing; the next tap asks again.
    }
  }

  const onPlacePress = (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
    // The press bubbles to the map, whose own press closes the list this one may open.
    event.stopPropagation()
    const target = pressedTarget(event.nativeEvent.features, event.nativeEvent.lngLat, groups)
    if (!target) return
    if (target.kind === 'place') onSelect(target.slug)
    else if (target.kind === 'spot') setOpen(target.group)
    else void expand(target.clusterId, target.center)
  }

  const count = pins.length === 1 ? '1 lugar' : `${pins.length} lugares`

  return (
    <View
      style={styles.map}
      testID="map-frame"
      onLayout={({ nativeEvent }) =>
        setSize({ width: nativeEvent.layout.width, height: nativeEvent.layout.height })
      }
    >
      {/* The marks are drawn by the map, out of a screen reader's reach; Explorar's
          list holds the same places, so the map says so and leads there. */}
      <View
        style={styles.map}
        accessible
        accessibilityRole={onShowList ? 'button' : 'image'}
        accessibilityLabel={`Mapa com ${count}`}
        accessibilityHint="Os mesmos lugares estão na lista."
        accessibilityActions={onShowList ? [{ name: 'activate', label: 'Ver em lista' }] : []}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'activate') onShowList?.()
        }}
      >
        <Map
          ref={map}
          style={styles.map}
          mapStyle={mapStyleUrl}
          onPress={() => {
            setOpen(null)
            onBackgroundPress?.()
          }}
          onRegionDidChange={(event) => {
            if (event.nativeEvent.userInteraction) setMoved(true)
          }}
        >
          <Camera
            ref={camera}
            initialViewState={{ center: [center.longitude, center.latitude], zoom: INITIAL_ZOOM }}
          />
          <Images images={images} />

          <GeoJSONSource
            ref={source}
            id="places"
            data={places}
            cluster
            clusterRadius={CLUSTER_RADIUS}
            clusterMaxZoom={CLUSTER_MAX_ZOOM}
            clusterProperties={{ places: ['+', ['get', 'places']] }}
            onPress={onPlacePress}
          >
            <Layer
              id="places"
              type="symbol"
              filter={['==', ['get', 'places'], 1]}
              layout={placeLayout(textFont, selected)}
              paint={{
                'icon-color': ink,
                'icon-halo-color': paper,
                'icon-halo-width': 2,
                'text-color': ink,
                'text-halo-color': paper,
                'text-halo-width': 1.5,
                'text-halo-blur': 0.5,
              }}
            />
            <Layer
              id="place-clusters"
              type="symbol"
              filter={['>', ['get', 'places'], 1]}
              layout={clusterLayout(textFont)}
              paint={{
                'icon-color': ink,
                'icon-halo-color': paper,
                'icon-halo-width': 2.5,
                'text-color': paper,
              }}
            />
          </GeoJSONSource>
        </Map>
      </View>

      {open ? (
        <PinGroupList
          group={open}
          onClose={() => setOpen(null)}
          onSelect={(slug) => {
            setOpen(null)
            onOpen(slug)
          }}
        />
      ) : null}

      {moved ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Centralizar o mapa na cidade"
          onPress={recentre}
          style={({ pressed }) => [
            styles.recentre,
            { backgroundColor: paper, opacity: pressed ? 0.85 : 1, right: spacing.md + rightInset },
          ]}
          testID="map-recentre"
        >
          <Ionicons name="scan-outline" size={18} color={ink} />
          <Text style={[styles.recentreLabel, { color: ink }]}>Centralizar</Text>
        </Pressable>
      ) : null}

      {/* The native dialog keeps the licence link; this keeps the credit visible. */}
      <View style={[styles.credit, { backgroundColor: colors.background }]} pointerEvents="none">
        <Text style={[styles.creditLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
          {credit}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  // Its own line above MapLibre's logo and attribution button: sharing that row
  // lets the credit collide with the logo on a narrow screen.
  credit: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    bottom: spacing.xl + spacing.xs,
    opacity: 0.85,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    position: 'absolute',
  },
  creditLabel: { ...typography.caption, fontSize: 11 },
  // Drawn in the map's own light palette, like the marks: the basemap is light in either theme.
  recentre: {
    alignItems: 'center',
    borderRadius: radius.pill,
    elevation: 4,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: minTouch,
    paddingHorizontal: spacing.lg,
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    top: spacing.md,
  },
  recentreLabel: { ...typography.label, ...textWeight('700') },
})
