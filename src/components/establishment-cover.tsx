import { Image } from 'expo-image'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { resolveMediaUrl } from '@/api/config'
import type { Media } from '@/catalog/types'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export function EstablishmentCover({
  cover,
  detail = false,
}: {
  cover?: Media | null
  detail?: boolean
}) {
  const colors = useColors()
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const asset = cover?.asset
  const url = asset?.url
  // A conservative display floor, not a catalog eligibility rule. In particular,
  // tiny seed placeholders must not become full-width photography.
  const usable = asset &&
    Number.isFinite(asset.width) &&
    asset.width >= 320 &&
    Number.isFinite(asset.height) &&
    asset.height >= 180

  if (!usable || !url?.trim() || !cover || failedUrl === url) {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.contentAbsent }]}>
        <View style={[styles.identifier, { borderColor: colors.contentAbsentBorder }]}>
          <Text style={[styles.caption, { color: colors.contentAbsentForeground }]}>Foto indisponível</Text>
        </View>
      </View>
    )
  }

  return (
    <Image
      source={{ uri: resolveMediaUrl(url) }}
      accessibilityLabel={cover.alt_text}
      style={[styles.cover, detail && styles.detail]}
      contentFit="cover"
      transition={150}
      onError={() => setFailedUrl(url)}
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
