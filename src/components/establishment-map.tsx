import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { EstablishmentSummary } from '@/catalog/types'
import { usesGoogleMaps } from '@/maps/config'
import { GoogleMapRenderer } from '@/maps/google-map'
import { MapLibreRenderer } from '@/maps/maplibre-map'
import { toPins } from '@/maps/types'
import { spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

interface Props {
  establishments: EstablishmentSummary[]
  fallbackCenter?: { latitude: number; longitude: number } | null
  onSelect: (slug: string) => void
}

/**
 * The map is a view mode of Explorar, not a destination of its own (ADR-0023
 * §4): it renders whatever the shared filter state already produced, issues no
 * query and carries no filter chrome.
 *
 * The renderer is chosen by configuration, not by platform: Google Maps when a
 * key exists, MapLibre otherwise, so a build without credentials still shows a
 * map instead of a grey rectangle.
 */
export function EstablishmentMap({ establishments, fallbackCenter, onSelect }: Props) {
  const colors = useColors()
  const pins = useMemo(() => toPins(establishments), [establishments])

  if (pins.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          Nenhum lugar com localização para mostrar no mapa.
        </Text>
      </View>
    )
  }

  // The city's own coordinates frame the result better than an arbitrary first
  // pin; the pin is only the fallback when the city has none.
  const center = fallbackCenter ?? { latitude: pins[0].latitude, longitude: pins[0].longitude }

  const Renderer = usesGoogleMaps ? GoogleMapRenderer : MapLibreRenderer

  return <Renderer pins={pins} center={center} onSelect={onSelect} />
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.xxl },
  message: { ...typography.body, textAlign: 'center' },
})
