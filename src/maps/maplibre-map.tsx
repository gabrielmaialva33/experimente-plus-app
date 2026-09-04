import { Camera, Map, Marker } from '@maplibre/maplibre-react-native'
import { StyleSheet, Text, View } from 'react-native'

import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { mapStyleUrl } from './config'
import type { MapRendererProps } from './types'

/**
 * Open-source renderer, used when no Google Maps key is configured.
 *
 * MapLibre needs no credential of its own — the style does. A Protomaps archive
 * served from the operation's own storage keeps it keyless end to end, since
 * MapLibre Native reads `pmtiles://` sources directly.
 */
export function MapLibreRenderer({ pins, center, onSelect }: MapRendererProps) {
  const colors = useColors()

  return (
    <Map style={styles.map} mapStyle={mapStyleUrl}>
      <Camera initialViewState={{ center: [center.longitude, center.latitude], zoom: 11 }} />

      {pins.map((pin) => (
        <Marker
          key={pin.slug}
          id={pin.slug}
          lngLat={[pin.longitude, pin.latitude]}
          onPress={() => onSelect(pin.slug)}>
          <View style={[styles.pin, { backgroundColor: colors.primary }]}>
            <Text style={[styles.label, { color: colors.primaryForeground }]} numberOfLines={1}>
              {pin.name}
            </Text>
          </View>
        </Marker>
      ))}
    </Map>
  )
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  pin: {
    borderRadius: radius.pill,
    maxWidth: 160,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: { ...typography.caption, fontWeight: '700' },
})
