import { StyleSheet, Text, View } from 'react-native'

import { resolveMediaUrl } from '@/api/config'
import type { Media } from '@/catalog/types'
import { RemoteImage } from '@/components/remote-image'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export function EstablishmentCover({
  cover,
  detail = false,
  height,
}: {
  cover?: Media | null
  detail?: boolean
  /** A fixed footprint, so a card keeps its height with or without a photo. */
  height?: number
}) {
  const colors = useColors()
  const asset = cover?.asset
  const url = asset?.url
  // A conservative display floor, not a catalog eligibility rule. In particular,
  // tiny seed placeholders must not become full-width photography.
  const usable = asset &&
    Number.isFinite(asset.width) &&
    asset.width >= 320 &&
    Number.isFinite(asset.height) &&
    asset.height >= 180

  const fallback = (
    <View style={[styles.fallback, height != null && { height }, { backgroundColor: colors.contentAbsent }]}>
      <View style={[styles.identifier, { borderColor: colors.contentAbsentBorder }]}>
        <Text style={[styles.caption, { color: colors.contentAbsentForeground }]}>Foto indisponível</Text>
      </View>
    </View>
  )

  if (!usable || !url?.trim() || !cover) return fallback

  return (
    <RemoteImage
      source={{ uri: resolveMediaUrl(url) }}
      accessibilityLabel={cover.alt_text}
      style={[styles.cover, detail && styles.detail, height != null && { height }]}
      contentFit="cover"
      transition={150}
      fallback={fallback}
    />
  )
}

const styles = StyleSheet.create({
  cover: { height: 160, width: '100%' },
  detail: { height: 220 },
  fallback: { minHeight: 72, justifyContent: 'center', padding: spacing.lg },
  identifier: { alignSelf: 'flex-start', borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.sm },
  caption: typography.caption,
})
