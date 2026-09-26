import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { EstablishmentCard } from '@/api/explorer'
import { resolveMediaUrl } from '@/api/config'
import { RemoteImage } from '@/components/remote-image'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/** One establishment in the Explorer's own lists: cover, name, category and city. */
export function EstablishmentCardRow({
  card,
  onPress,
}: {
  card: EstablishmentCard
  onPress?: () => void
}) {
  const colors = useColors()
  const meta = [card.category, card.city_name].filter(Boolean).join(' · ')

  return (
    <Pressable
      accessibilityRole={onPress ? 'link' : undefined}
      accessibilityLabel={`${card.name}${meta ? `, ${meta}` : ''}`}
      disabled={!onPress}
      onPress={onPress}
      style={styles.row}>
      {card.cover_url ? (
        <RemoteImage
          source={{ uri: resolveMediaUrl(card.cover_url) }}
          style={[styles.cover, { backgroundColor: colors.surfaceBase }]}
          contentFit="cover"
          accessible={false}
          fallback={<View style={[styles.cover, { backgroundColor: colors.surfaceBase }]} />}
        />
      ) : (
        <View style={[styles.cover, { backgroundColor: colors.surfaceBase }]} />
      )}
      <View style={styles.text}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {card.name}
        </Text>
        {meta ? (
          <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  cover: { borderRadius: radius.md, height: 56, width: 56 },
  text: { flex: 1, gap: spacing.xs },
  name: { ...typography.body, fontWeight: '600' },
  meta: typography.caption,
})
