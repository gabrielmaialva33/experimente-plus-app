import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { operatingStatus } from '@/catalog/operating-status'
import type { EstablishmentSummary } from '@/catalog/types'
import { Badge } from '@/components/badge'
import { EstablishmentCover } from '@/components/establishment-cover'
import { OperatingStatus } from '@/components/operating-status'
import { ratingLabel as spokenRating } from '@/reviews/stars'
import { useLineCap } from '@/theme/font-scale'
import { minTouch, radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

interface Props {
  establishment: EstablishmentSummary
  onPress: () => void
  /** A control drawn over the photo's top-right corner, such as a favourite. */
  accessory?: ReactNode
  /** In a grid, `{ flex: 1 }`: the cards of a row share the tallest one's height. */
  style?: StyleProp<ViewStyle>
}

/** "4,5 ★ (2)" — only when someone has rated the place. */
export function ratingLabel(reviews: EstablishmentSummary['reviews'] | undefined) {
  if (!reviews || !reviews.count || reviews.average == null) return null
  return `${reviews.average.toFixed(1).replace('.', ',')} ★ (${reviews.count})`
}

/**
 * What the card says to a screen reader, in reading order: the name first, then
 * its state, and the rating as words — "★ (2)" would be read as a symbol name.
 */
function cardLabel(establishment: EstablishmentSummary) {
  const { reviews } = establishment
  const rating =
    reviews?.count && reviews.average != null
      ? `Nota ${spokenRating(reviews.average)}, ${reviews.count === 1 ? '1 avaliação' : `${reviews.count} avaliações`}`
      : null
  return [
    establishment.name,
    operatingStatus(establishment).label,
    establishment.primary_category?.name,
    establishment.address.district,
    rating,
    establishment.is_sponsored ? 'Patrocinado' : null,
    establishment.short_description,
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * The place card of direction A: the photo leads, the state sits on it, and
 * the name is set in the display face. The seam under the photo stays, so a
 * photo edge never touches the text.
 */
export function EstablishmentCard({ establishment, onPress, accessory, style }: Props) {
  const colors = useColors()
  const oneLine = useLineCap(1)
  const twoLines = useLineCap(2)
  const meta = [
    establishment.primary_category?.name,
    establishment.address.district,
    ratingLabel(establishment.reviews),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={cardLabel(establishment)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderSubtle,
          opacity: pressed ? 0.92 : 1,
        },
        style,
      ]}
    >
      <View>
        <EstablishmentCover cover={establishment.cover} height={196} />
        {/* Held between both edges, so a long state at large text wraps inside the photo
            instead of running out of the card; it keeps clear of the accessory. */}
        <View
          style={[styles.status, accessory ? styles.statusBesideAccessory : null]}
          pointerEvents="none"
        >
          <OperatingStatus
            establishment={{
              business_status: establishment.business_status,
              is_open_now: establishment.is_open_now,
            }}
          />
        </View>
        {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      </View>

      <View style={[styles.body, { borderTopColor: colors.borderSubtle }]}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={twoLines}>
          {establishment.name}
        </Text>
        {meta ? (
          <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={oneLine}>
            {meta}
          </Text>
        ) : null}
        {establishment.short_description ? (
          <Text
            style={[styles.description, { color: colors.mutedForeground }]}
            numberOfLines={twoLines}
          >
            {establishment.short_description}
          </Text>
        ) : null}
        {/* Paid placement is always labelled, per the trust principles. */}
        {establishment.is_sponsored ? <Badge label="Patrocinado" tone="neutral" /> : null}
      </View>
    </Pressable>
  )
}

/** Where a control over the photo sits from its corner. */
const ACCESSORY_INSET = spacing.sm + 2

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  status: { left: spacing.md, position: 'absolute', right: spacing.md, top: spacing.md },
  statusBesideAccessory: { right: ACCESSORY_INSET + minTouch + spacing.sm },
  accessory: { position: 'absolute', right: ACCESSORY_INSET, top: ACCESSORY_INSET },
  // A continuous seam plus an inset keeps any photo edge away from the text.
  body: {
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
  },
  name: { ...typography.heading, fontSize: 19, lineHeight: 24 },
  meta: typography.meta,
  description: typography.meta,
})
