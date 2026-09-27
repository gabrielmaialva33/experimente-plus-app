import Ionicons from '@expo/vector-icons/Ionicons'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { decorative } from '@/components/decorative'
import { RemoteImage } from '@/components/remote-image'
import { useLineCap, useScaledWidth } from '@/theme/font-scale'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export const COMPACT_CARD = { width: 220, height: 214, image: 124 } as const

/** The width every card of a row shares at the current system text size. */
export const useCompactCardWidth = () => useScaledWidth(COMPACT_CARD.width)

/**
 * A card of a horizontal row. Width is fixed and the title has two lines at
 * most, so cards in one row never differ in size (audit A47). With larger
 * system text the lines are not cut: the card grows instead, and the row
 * stretches its neighbours to match; its width grows with the text too, up to
 * 1.6 times, so a long word is not split across lines. Without a photo, `media` (a date tile, for
 * example) takes the same footprint.
 */
export function CompactCard({
  title,
  meta,
  overline,
  image,
  media,
  onPress,
  accessibilityLabel,
  testID,
}: {
  title: string
  meta?: string | null
  overline?: string | null
  image?: { uri: string; alt: string } | null
  /** Drawn in the photo's place and hidden from screen readers: say it in `accessibilityLabel`. */
  media?: ReactNode
  onPress: () => void
  accessibilityLabel?: string
  testID?: string
}) {
  const colors = useColors()
  const oneLine = useLineCap(1)
  const twoLines = useLineCap(2)
  const width = useCompactCardWidth()
  const fallback = (
    <View style={[styles.image, styles.fallback, { backgroundColor: colors.primarySoft }]}>
      <Ionicons name="image-outline" size={28} color={colors.primaryAccent} />
    </View>
  )

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [overline, title, meta].filter(Boolean).join(', ')}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          backgroundColor: colors.card,
          borderColor: colors.borderSubtle,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {image ? (
        <RemoteImage
          source={{ uri: image.uri }}
          accessibilityLabel={image.alt}
          style={styles.image}
          contentFit="cover"
          transition={150}
          fallback={fallback}
        />
      ) : media ? (
        // The card speaks as one; what `media` shows belongs in its label.
        <View
          style={[styles.image, styles.fallback, { backgroundColor: colors.primarySoft }]}
          {...decorative}
        >
          {media}
        </View>
      ) : (
        fallback
      )}
      <View style={styles.body}>
        {overline ? (
          <Text numberOfLines={oneLine} style={[styles.overline, { color: colors.primaryAccent }]}>
            {overline}
          </Text>
        ) : null}
        <Text numberOfLines={twoLines} style={[styles.title, { color: colors.foreground }]}>
          {title}
        </Text>
        {meta ? (
          <Text numberOfLines={oneLine} style={[styles.meta, { color: colors.mutedForeground }]}>
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: COMPACT_CARD.height,
    overflow: 'hidden',
  },
  image: { height: COMPACT_CARD.image, width: '100%' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2, paddingHorizontal: 14, paddingVertical: spacing.md },
  overline: typography.overline,
  title: { ...typography.heading, fontSize: 16, lineHeight: 20 },
  meta: typography.caption,
})
