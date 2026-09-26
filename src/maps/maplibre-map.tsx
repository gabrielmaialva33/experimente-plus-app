import { Camera, Map, Marker } from '@maplibre/maplibre-react-native'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { useMapCredit } from './attribution'
import { mapStyleUrl } from './config'
import { PinGroupList } from './pin-group-list'
import { groupLabel, groupPins, type MapPinGroup, type MapRendererProps } from './types'

/**
 * Open-source renderer, used when no Google Maps key is configured.
 *
 * MapLibre needs no credential of its own — the style does. A Protomaps archive
 * served from the operation's own storage keeps it keyless end to end, since
 * MapLibre Native reads `pmtiles://` sources directly.
 */
export function MapLibreRenderer({ pins, center, onSelect }: MapRendererProps) {
  const colors = useColors()
  const credit = useMapCredit()
  const groups = useMemo(() => groupPins(pins), [pins])
  const [open, setOpen] = useState<MapPinGroup | null>(null)

  return (
    <View style={styles.map}>
      <Map style={styles.map} mapStyle={mapStyleUrl}>
        <Camera initialViewState={{ center: [center.longitude, center.latitude], zoom: 11 }} />

        {groups.map((group) => (
          <Marker
            key={group.key}
            id={group.key}
            lngLat={[group.longitude, group.latitude]}
            onPress={() =>
              group.pins.length === 1 ? onSelect(group.pins[0].slug) : setOpen(group)
            }>
            <View
              accessibilityRole="button"
              accessibilityLabel={
                group.pins.length === 1
                  ? group.pins[0].name
                  : `${groupLabel(group)}: ${group.pins.map((pin) => pin.name).join(', ')}`
              }
              style={[styles.pin, { backgroundColor: colors.primary }]}>
              <Text style={[styles.label, { color: colors.primaryForeground }]} numberOfLines={1}>
                {groupLabel(group)}
              </Text>
            </View>
          </Marker>
        ))}
      </Map>

      {open ? (
        <PinGroupList
          group={open}
          onClose={() => setOpen(null)}
          onSelect={(slug) => {
            setOpen(null)
            onSelect(slug)
          }}
        />
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
  pin: {
    borderRadius: radius.pill,
    maxWidth: 160,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: { ...typography.caption, ...textWeight('700') },
})
