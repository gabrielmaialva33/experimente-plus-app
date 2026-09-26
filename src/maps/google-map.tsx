import { AppleMaps, GoogleMaps } from 'expo-maps'
import { useMemo, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'

import { PinGroupList } from './pin-group-list'
import { groupLabel, groupPins, type MapPinGroup, type MapRendererProps } from './types'

/** `expo-maps` exposes platform namespaces: Google on Android, Apple on iOS. */
export function GoogleMapRenderer({ pins, center, onSelect }: MapRendererProps) {
  const groups = useMemo(() => groupPins(pins), [pins])
  const [open, setOpen] = useState<MapPinGroup | null>(null)
  const markers = useMemo(
    () =>
      groups.map((group) => ({
        id: group.key,
        coordinates: { latitude: group.latitude, longitude: group.longitude },
        title: groupLabel(group),
        snippet:
          group.pins.length === 1
            ? (group.pins[0].category ?? undefined)
            : group.pins.map((pin) => pin.name).join(', '),
      })),
    [groups]
  )

  // Same behaviour as the MapLibre renderer: one place opens, several list.
  const onMarkerClick = (marker: { id?: string }) => {
    const group = groups.find((candidate) => candidate.key === marker.id)
    if (!group) return
    if (group.pins.length === 1) onSelect(group.pins[0].slug)
    else setOpen(group)
  }

  const cameraPosition = { coordinates: center, zoom: 12 }
  const MapView = Platform.OS === 'ios' ? AppleMaps.View : GoogleMaps.View

  return (
    <View style={styles.map}>
      <MapView style={styles.map} cameraPosition={cameraPosition} markers={markers} onMarkerClick={onMarkerClick} />
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
    </View>
  )
}

const styles = StyleSheet.create({ map: { flex: 1 } })
