import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { EstablishmentSummary } from '@/catalog/types'
import { Badge } from '@/components/badge'
import { EstablishmentCover } from '@/components/establishment-cover'
import { OperatingStatus } from '@/components/operating-status'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

interface Props {
  establishment: EstablishmentSummary
  onPress: () => void
  /** A control drawn over the photo's top-right corner, such as a favourite. */
  accessory?: ReactNode
}

/** "4,5 ★ (2)" — only when someone has rated the place. */
export function ratingLabel(reviews: EstablishmentSummary['reviews'] | undefined) {
  if (!reviews || !reviews.count || reviews.average == null) return null
  return `${reviews.average.toFixed(1).replace('.', ',')} ★ (${reviews.count})`
}

/**
 * The place card of direction A: the photo leads, the state sits on it, and
 * the name is set in the display face. The seam under the photo stays, so a
 * photo edge never touches the text.
 */
export function EstablishmentCard({ establishment, onPress, accessory }: Props) {
  const colors = useColors()
  const meta = [
    establishment.primary_category?.name,
    establishment.address.district,
    ratingLabel(establishment.reviews),
  ].filter(Boolean).join(' · ')

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.borderSubtle, opacity: pressed ? 0.92 : 1 },
      ]}>
      <View>
        <EstablishmentCover cover={establishment.cover} height={196} />
        <View style={styles.status} pointerEvents="none">
          <OperatingStatus establishment={{
            business_status: establishment.business_status,
            is_open_now: establishment.is_open_now,
          }} />
        </View>
        {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      </View>

      <View style={[styles.body, { borderTopColor: colors.borderSubtle }]}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {establishment.name}
        </Text>
        {meta ? (
          <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {establishment.short_description ? (
          <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
            {establishment.short_description}
          </Text>
        ) : null}
        {/* Paid placement is always labelled, per the trust principles. */}
        {establishment.is_sponsored ? <Badge label="Patrocinado" tone="neutral" /> : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  status: { left: spacing.md, position: 'absolute', top: spacing.md },
  accessory: { position: 'absolute', right: spacing.sm + 2, top: spacing.sm + 2 },
  // A continuous seam plus an inset keeps any photo edge away from the text.
  body: { borderTopWidth: 1, gap: spacing.sm, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: 14 },
  name: { ...typography.heading, fontSize: 19, lineHeight: 24 },
  meta: typography.meta,
  description: typography.meta,
})
