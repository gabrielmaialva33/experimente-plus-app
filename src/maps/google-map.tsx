import { AppleMaps, GoogleMaps } from 'expo-maps'
import { useMemo } from 'react'
import { Platform, StyleSheet } from 'react-native'

import type { MapRendererProps } from './types'

/** `expo-maps` exposes platform namespaces: Google on Android, Apple on iOS. */
export function GoogleMapRenderer({ pins, center, onSelect }: MapRendererProps) {
  const markers = useMemo(
    () =>
      pins.map((pin) => ({
        id: pin.slug,
        coordinates: { latitude: pin.latitude, longitude: pin.longitude },
        title: pin.name,
        snippet: pin.category ?? undefined,
      })),
    [pins]
  )

  const cameraPosition = { coordinates: center, zoom: 12 }

  if (Platform.OS === 'ios') {
    return (
      <AppleMaps.View
        style={styles.map}
        cameraPosition={cameraPosition}
        markers={markers}
        onMarkerClick={(marker) => marker.id && onSelect(marker.id)}
      />
    )
  }

  return (
    <GoogleMaps.View
      style={styles.map}
      cameraPosition={cameraPosition}
      markers={markers}
      onMarkerClick={(marker) => marker.id && onSelect(marker.id)}
    />
  )
}

const styles = StyleSheet.create({ map: { flex: 1 } })
