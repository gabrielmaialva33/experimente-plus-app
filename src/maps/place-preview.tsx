import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { operatingStatus } from '@/catalog/operating-status'
import type { EstablishmentSummary } from '@/catalog/types'
import { ratingLabel } from '@/components/establishment-card'
import { coverImage } from '@/components/establishment-cover'
import { IconButton } from '@/components/icon-button'
import { OperatingStatus } from '@/components/operating-status'
import { RemoteImage } from '@/components/remote-image'
import { useLineCap } from '@/theme/font-scale'
import { radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const THUMB = 88

/**
 * The place a tap picked on the map, held at its foot: a tap on a mark says
 * which place it is, and only a tap here leaves the map for its page. Opening
 * the page straight from the mark made the map a one-shot chooser, and a
 * person comparing places had to come back and find their spot every time.
 */
export function PlacePreview({
  establishment,
  onOpen,
  onClose,
}: {
  establishment: EstablishmentSummary
  onOpen: () => void
  onClose: () => void
}) {
  const colors = useColors()
  const twoLines = useLineCap(2)
  const oneLine = useLineCap(1)
  const image = coverImage(establishment.cover)
  // The rating before the district: on one short line it is what a comparison needs.
  const meta = [
    establishment.primary_category?.name,
    ratingLabel(establishment.reviews),
    establishment.address.district,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
      testID={`map-preview-${establishment.slug}`}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[
          establishment.name,
          operatingStatus(establishment).label,
          establishment.primary_category?.name,
          establishment.address.district,
        ]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint="Abre a página do lugar."
        onPress={onOpen}
        style={({ pressed }) => [styles.open, { opacity: pressed ? 0.92 : 1 }]}
      >
        <View style={[styles.thumb, { backgroundColor: colors.contentAbsent }]}>
          {image ? (
            <RemoteImage
              source={{ uri: image.uri }}
              style={styles.thumb}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <Ionicons name="storefront-outline" size={28} color={colors.contentAbsentForeground} />
          )}
        </View>
        <View style={styles.copy}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={twoLines}>
            {establishment.name}
          </Text>
          {meta ? (
            <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={oneLine}>
              {meta}
            </Text>
          ) : null}
          <View style={styles.status}>
            <OperatingStatus
              establishment={{
                business_status: establishment.business_status,
                is_open_now: establishment.is_open_now,
              }}
            />
            <Ionicons name="chevron-forward" size={18} color={colors.primaryAccent} />
          </View>
        </View>
      </Pressable>
      <View style={styles.close}>
        <IconButton icon="close" tone="plain" accessibilityLabel="Fechar" onPress={onClose} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    elevation: 6,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  open: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    // Room for the close button, so the name never runs under it.
    paddingRight: spacing.md + 40,
  },
  thumb: {
    alignItems: 'center',
    borderRadius: radius.thumb,
    height: THUMB,
    justifyContent: 'center',
    overflow: 'hidden',
    width: THUMB,
  },
  copy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  name: { ...typography.label, ...textWeight('700'), fontSize: 16, lineHeight: 21 },
  meta: typography.meta,
  status: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  close: { position: 'absolute', right: spacing.xs, top: spacing.xs },
})
