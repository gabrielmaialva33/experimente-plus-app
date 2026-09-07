import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { EstablishmentSummary } from '@/catalog/types'
import { EstablishmentCover } from '@/components/establishment-cover'
import { OperatingStatus } from '@/components/operating-status'
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
      <EstablishmentCover cover={establishment.cover} />

      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {establishment.name}
        </Text>
        <OperatingStatus establishment={{
          business_status: establishment.business_status,
          is_open_now: establishment.is_open_now,
        }} />

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
  body: { gap: spacing.xs, padding: spacing.lg },
  name: typography.heading,
  description: typography.body,
  meta: typography.caption,
  sponsored: { ...typography.caption, fontWeight: '600', textTransform: 'uppercase' },
})
