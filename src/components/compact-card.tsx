import Ionicons from '@expo/vector-icons/Ionicons'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { RemoteImage } from '@/components/remote-image'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export const COMPACT_CARD = { width: 220, height: 214, image: 124 } as const

/**
 * A card of a horizontal row. Width and height are fixed, and the title has
 * two lines at most, so cards in one row never differ in size (audit A47).
 * Without a photo, `media` (a date tile, for example) takes the same footprint.
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
  media?: ReactNode
  onPress: () => void
  accessibilityLabel?: string
  testID?: string
}) {
  const colors = useColors()
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
        { backgroundColor: colors.card, borderColor: colors.borderSubtle, opacity: pressed ? 0.92 : 1 },
      ]}>
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
        <View style={[styles.image, styles.fallback, { backgroundColor: colors.primarySoft }]}>{media}</View>
      ) : (
        fallback
      )}
      <View style={styles.body}>
        {overline ? (
          <Text numberOfLines={1} style={[styles.overline, { color: colors.primaryAccent }]}>
            {overline}
          </Text>
        ) : null}
        <Text numberOfLines={2} style={[styles.title, { color: colors.foreground }]}>
          {title}
        </Text>
        {meta ? (
          <Text numberOfLines={1} style={[styles.meta, { color: colors.mutedForeground }]}>
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
    height: COMPACT_CARD.height,
    overflow: 'hidden',
    width: COMPACT_CARD.width,
  },
  image: { height: COMPACT_CARD.image, width: '100%' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2, paddingHorizontal: 14, paddingVertical: spacing.md },
  overline: typography.overline,
  title: { ...typography.heading, fontSize: 16, lineHeight: 20 },
  meta: typography.caption,
})

