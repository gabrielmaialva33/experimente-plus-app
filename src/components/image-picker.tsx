import Ionicons from '@expo/vector-icons/Ionicons'
import { Image } from 'expo-image'
import {
  launchImageLibraryAsync,
  UIImagePickerPreferredAssetRepresentationMode,
} from 'expo-image-picker'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { validateImageAsset, type ValidatedImageAsset } from '@/media/image-validation'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export type SelectedImage = ValidatedImageAsset

export interface ImagePickerProps {
  images: SelectedImage[]
  onChange: (images: SelectedImage[]) => void
  maxImages: number
  disabled?: boolean
  label?: string
  error?: string | null
  onError?: (error: string | null) => void
}

/**
 * Reusable image picker component.
 *
 * Enforces client-side validation rules (ADR 0014, ADR 0027):
 * - Accepts JPEG, PNG, WebP
 * - Rejects HEIC/HEIF and videos
 * - Configures iOS picker to request compatible representation mode (JPEG conversion)
 * - Limits selection to the parameter-provided `maxImages`
 */
export function ImagePicker({
  images,
  onChange,
  maxImages,
  disabled = false,
  label = 'Fotos',
  error,
  onError,
}: ImagePickerProps) {
  const colors = useColors()
  const [localError, setLocalError] = useState<string | null>(null)
  const displayError = error ?? localError

  const pickImages = async () => {
    if (disabled || images.length >= maxImages) return
    setLocalError(null)
    onError?.(null)

    const remainingSlots = Math.max(0, maxImages - images.length)

    try {
      const result = await launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
        quality: 0.85,
        preferredAssetRepresentationMode:
          UIImagePickerPreferredAssetRepresentationMode.Compatible,
      })

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return
      }

      const accepted: SelectedImage[] = []
      let failureReason: string | null = null

      for (const asset of result.assets) {
        if (images.length + accepted.length >= maxImages) {
          failureReason = `Limite máximo de ${maxImages} fotos atingido.`
          break
        }

        const validation = validateImageAsset(asset)
        if (!validation.valid) {
          failureReason = validation.reason
          continue
        }

        accepted.push(validation.sanitizedAsset)
      }

      if (failureReason) {
        setLocalError(failureReason)
        onError?.(failureReason)
      }

      if (accepted.length > 0) {
        onChange([...images, ...accepted])
      }
    } catch {
      const genericError = 'Não foi possível acessar a galeria de imagens.'
      setLocalError(genericError)
      onError?.(genericError)
    }
  }

  const removeImage = (index: number) => {
    if (disabled) return
    const updated = images.filter((_, i) => i !== index)
    onChange(updated)
    setLocalError(null)
    onError?.(null)
  }

  const canAddMore = images.length < maxImages && !disabled

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.counter, { color: colors.mutedForeground }]}>
          {images.length}/{maxImages}
        </Text>
      </View>

      <View style={styles.grid}>
        {images.map((image, index) => (
          <View
            key={`${image.uri}-${index}`}
            style={[styles.thumbnailWrapper, { borderColor: colors.border }]}>
            <Image
              source={{ uri: image.uri }}
              style={styles.thumbnail}
              contentFit="cover"
              accessibilityLabel={`Foto ${index + 1} de ${images.length}`}
            />
            {!disabled && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover foto ${index + 1}`}
                onPress={() => removeImage(index)}
                style={[styles.removeButton, { backgroundColor: colors.surfaceBase }]}>
                <Ionicons name="close-circle" size={22} color={colors.foreground} />
              </Pressable>
            )}
          </View>
        ))}

        {canAddMore && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Adicionar foto. ${images.length} de ${maxImages} adicionadas.`}
            onPress={pickImages}
            style={[
              styles.addButton,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: displayError ? colors.warningAccent : colors.border,
              },
            ]}>
            <Ionicons name="camera-outline" size={24} color={colors.primary} />
            <Text style={[styles.addText, { color: colors.primary }]}>Adicionar</Text>
          </Pressable>
        )}
      </View>

      {displayError ? (
        <Text
          accessibilityRole="alert"
          style={[styles.errorText, { color: colors.warningAccent }]}>
          {displayError}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.body,
    fontWeight: '600',
  },
  counter: {
    ...typography.caption,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumbnailWrapper: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: radius.pill,
  },
  addButton: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addText: {
    ...typography.caption,
    fontWeight: '600',
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
})
