import { Image } from 'expo-image'

import { resolveMediaUrl } from '@/api/config'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { EstablishmentSummary } from '@/catalog/types'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

interface Props {
  establishment: EstablishmentSummary
  onPress: () => void
}

export function EstablishmentCard({ establishment, onPress }: Props) {
  const colors = useColors()
  const category = establishment.primary_category?.name
  const district = establishment.address.district

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image
        source={{ uri: resolveMediaUrl(establishment.cover.asset.url) }}
        accessibilityLabel={establishment.cover.alt_text}
        style={styles.cover}
        contentFit="cover"
        transition={150}
      />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {establishment.name}
          </Text>
          {/* Server-projected. The client never recomputes `open_now`. */}
          {establishment.is_open_now ? (
            <Text style={[styles.open, { color: colors.success }]}>Aberto agora</Text>
          ) : null}
        </View>

        {establishment.short_description ? (
          <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
            {establishment.short_description}
          </Text>
        ) : null}

        <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
          {[category, district].filter(Boolean).join(' · ')}
        </Text>

        {/* Paid placement is always labelled, per the trust principles. */}
        {establishment.is_sponsored ? (
          <Text style={[styles.sponsored, { color: colors.mutedForeground }]}>Patrocinado</Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.surface,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cover: { height: 160, width: '100%' },
  body: { gap: spacing.xs, padding: spacing.lg },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  name: { ...typography.heading, flexShrink: 1 },
  open: { ...typography.caption, fontWeight: '600' },
  description: typography.body,
  meta: typography.caption,
  sponsored: { ...typography.caption, fontWeight: '600', textTransform: 'uppercase' },
})
