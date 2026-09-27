import Ionicons from '@expo/vector-icons/Ionicons'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useScreenFrame } from '@/components/content-frame'
import { decorative } from '@/components/decorative'
import { RemoteImage } from '@/components/remote-image'
import { useLineCap, useScaledWidth } from '@/theme/font-scale'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export const COMPACT_CARD = { width: 220, height: 214, image: 124 } as const

/** The share of the column a card may take at most, so the next one still peeks in. */
const MAX_COLUMN_SHARE = 0.86

/**
 * The width every card of a row shares at the current system text size. It
 * grows with the text, but never past most of the column: at 200% on a narrow
 * phone a card 1.6 times as wide ran off the screen with its own heart and "⋯".
 */
export function useCompactCardWidth() {
  const scaled = useScaledWidth(COMPACT_CARD.width)
  const { width } = useScreenFrame()
  return compactCardWidth(scaled, width)
}

/** A row card's width: the scaled width, capped to a share of the column. */
export const compactCardWidth = (scaled: number, columnWidth: number) =>
  Math.min(scaled, Math.floor(columnWidth * MAX_COLUMN_SHARE))

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
