import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { EstablishmentSummary } from '@/catalog/types'
import { usesGoogleMaps } from '@/maps/config'
import { GoogleMapRenderer } from '@/maps/google-map'
import { MapLibreRenderer } from '@/maps/maplibre-map'
import { PlacePreview } from '@/maps/place-preview'
import { toPins } from '@/maps/types'
import { spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

interface Props {
  establishments: EstablishmentSummary[]
  fallbackCenter?: { latitude: number; longitude: number } | null
  /** Opens the place's page. */
  onSelect: (slug: string) => void
  /** Back to the list, where a screen reader reaches every place the map draws. */
  onShowList?: () => void
}

/**
 * The map is a view mode of Explorar, not a destination of its own (ADR-0023
 * §4): it renders whatever the shared filter state already produced, issues no
 * query and carries no filter chrome.
 *
 * The renderer is chosen by configuration, not by platform: Google Maps when a
 * key exists, MapLibre otherwise, so a build without credentials still shows a
 * map instead of a grey rectangle.
 *
 * A tap on a place holds it in a card at the map's foot; the card opens its page.
 */
export function EstablishmentMap({ establishments, fallbackCenter, onSelect, onShowList }: Props) {
  const colors = useColors()
  const pins = useMemo(() => toPins(establishments), [establishments])
  const [held, setHeld] = useState<string | null>(null)
  // A place a new filter took off the map takes its card with it.
  const preview = held ? (establishments.find((item) => item.slug === held) ?? null) : null

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

  return (
    <View style={styles.fill}>
      <Renderer
        pins={pins}
        center={center}
        onSelect={setHeld}
        onOpen={onSelect}
        selected={preview?.slug ?? null}
        onBackgroundPress={() => setHeld(null)}
        onShowList={onShowList}
      />
      {preview ? (
        <View style={styles.preview}>
          <View style={styles.previewCard}>
            <PlacePreview
              establishment={preview}
              onOpen={() => onSelect(preview.slug)}
              onClose={() => setHeld(null)}
            />
          </View>
        </View>
      ) : null}
    </View>
  )
}

/** A phone's measure for the card, however wide the map. */
const PREVIEW_MAX_WIDTH = 520

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Above the map's credit line and its logo, which stay in sight.
  // On a tablet or an unfolded phone the card keeps a phone's measure, centred.
  preview: {
    alignItems: 'center',
    bottom: 56,
    left: spacing.gutter,
    position: 'absolute',
    right: spacing.gutter,
  },
  previewCard: { maxWidth: PREVIEW_MAX_WIDTH, width: '100%' },
  empty: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.xxl },
  message: { ...typography.body, textAlign: 'center' },
})
