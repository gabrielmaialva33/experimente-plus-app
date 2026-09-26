import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { EstablishmentCard } from '@/api/explorer'
import { resolveMediaUrl } from '@/api/config'
import { RemoteImage } from '@/components/remote-image'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * One establishment in the person's own lists: cover, name, category and city,
 * and an optional action at the end of the line. The name keeps to one line so
 * every row of a list has the same height (audit A56).
 */
export function EstablishmentCardRow({
  card,
  onPress,
  trailing,
}: {
  card: EstablishmentCard
  onPress?: () => void
  trailing?: ReactNode
}) {
  const colors = useColors()
  const meta = [card.category, card.city_name].filter(Boolean).join(' · ')

  return (
    <View style={styles.line}>
      <Pressable
        accessibilityRole={onPress ? 'link' : undefined}
        accessibilityLabel={`${card.name}${meta ? `, ${meta}` : ''}`}
        disabled={!onPress}
        onPress={onPress}
        style={styles.row}>
        {card.cover_url ? (
          <RemoteImage
            source={{ uri: resolveMediaUrl(card.cover_url) }}
            style={[styles.cover, { backgroundColor: colors.muted }]}
            contentFit="cover"
            accessible={false}
            fallback={<View style={[styles.cover, { backgroundColor: colors.muted }]} />}
          />
        ) : (
          <View style={[styles.cover, { backgroundColor: colors.muted }]} />
        )}
        <View style={styles.text}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {card.name}
          </Text>
          {meta ? (
            <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {trailing}
    </View>
  )
}

const styles = StyleSheet.create({
  line: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  row: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.md, minHeight: 64 },
  cover: { borderRadius: radius.thumb, height: 64, width: 64 },
  text: { flex: 1, gap: 2 },
  name: { ...typography.body, ...textWeight('700') },
  meta: typography.meta,
})
