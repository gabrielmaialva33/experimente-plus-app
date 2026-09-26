import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import type { ReviewPhoto } from '@/api/reviews'
import { resolveMediaUrl } from '@/api/config'
import { RemoteImage } from '@/components/remote-image'
import { radius, spacing } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * The photos of a review, in the order the server keeps them.
 *
 * Each has a description for assistive technology: the one the author wrote,
 * or a neutral one — never an empty label, which a screen reader would skip as
 * if the image were not there.
 */
export function ReviewPhotos({
  photos,
  onRemove,
  removing = false,
}: {
  photos: ReviewPhoto[]
  onRemove?: (photo: ReviewPhoto) => void
  removing?: boolean
}) {
  const colors = useColors()
  if (photos.length === 0) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel={photos.length === 1 ? '1 foto' : `${photos.length} fotos`}>
      {photos.map((photo, index) => {
        const label = photo.alt_text || `Foto ${index + 1} da avaliação`
        return (
          <View key={photo.id} style={styles.item} testID={`review-photo-${photo.id}`}>
            {photo.url ? (
              <RemoteImage
                source={{ uri: resolveMediaUrl(photo.url) }}
                accessibilityLabel={label}
                accessible
                contentFit="cover"
                style={[styles.image, { backgroundColor: colors.surfaceRaised }]}
                fallback={<View accessibilityLabel={label} accessible style={[styles.image, { backgroundColor: colors.surfaceRaised }]} />}
              />
            ) : null}
            {onRemove ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover ${label}`}
                accessibilityState={{ disabled: removing }}
                disabled={removing}
                hitSlop={spacing.sm}
                onPress={() => onRemove(photo)}
                style={[styles.remove, { backgroundColor: colors.destructiveSoft, borderColor: colors.destructive }]}
                testID={`remove-photo-${photo.id}`}>
                <Ionicons name="close" size={16} color={colors.destructiveAccent} accessible={false} />
              </Pressable>
            ) : null}
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  item: { position: 'relative' },
  image: { borderRadius: radius.md, height: 88, width: 88 },
  remove: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 28,
  },
})
