import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { failureMessage } from '@/app/avaliar/[establishmentId]'
import type { Review } from '@/api/reviews'
import { ImagePicker } from '@/components/image-picker'
import {
  useAddReviewPhoto,
  useAuthorRules,
  useMyReviews,
  useRemoveReviewPhoto,
  useUpdateReview,
} from '@/reviews/queries'
import { ReviewPhotos } from '@/reviews/review-photos'
import { StarsInput } from '@/reviews/stars'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * Editing a review already written.
 *
 * The edit window and the minimum interval between edits are tenant policy and
 * are enforced by the server; refusing here would only guess at them. The form
 * starts from what was written, so an edit never silently replaces the text
 * with an empty field.
 */
export default function EditReviewScreen() {
  const colors = useColors()
  const { id } = useLocalSearchParams<{ id: string }>()
  const reviewId = Number(id)

  // Same page size as the listing this screen is opened from, so the review is
  // already in the cache and editing does not wait on a second request. There is
  // no route that fetches one of the author's own reviews by id.
  const mine = useMyReviews({ perPage: 20 })
  const review = mine.data?.data.find((item) => item.id === reviewId)

  if (mine.isPending) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>Carregando…</Text>
      </View>
    )
  }

  if (!review) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <Text style={[styles.body, { color: colors.foreground }]}>
          Esta avaliação não está mais disponível.
        </Text>
      </View>
    )
  }

  // Keyed by the review: the form's initial state is the review that was
  // loaded, so it is set once when that review arrives and never synchronised
  // back and forth by an effect.
  return <EditForm key={review.id} review={review} />
}

function EditForm({ review }: { review: Review }) {
  const colors = useColors()
  const router = useRouter()
  const [rating, setRating] = useState(review.rating)
  const [comment, setComment] = useState(review.comment ?? '')
  const update = useUpdateReview(review.id)
  const rules = useAuthorRules()
  const addPhoto = useAddReviewPhoto(review.id)
  const removePhoto = useRemoveReviewPhoto(review.id)
  const photos = review.photos ?? []
  // Photos are added and removed as they are chosen, not on save: each is its
  // own request, and holding them until "Salvar" would lose them on a failed
  // text edit that has nothing to do with them.
  const remaining = Math.max(0, (rules.data?.max_photos ?? 0) - photos.length)
  const photoBusy = addPhoto.isPending || removePhoto.isPending

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <Text style={[styles.title, { color: colors.foreground }]}>Editar avaliação</Text>

      <View style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <StarsInput rating={rating} onChange={setRating} disabled={update.isPending} />
      </View>

      <TextInput
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={4000}
        editable={!update.isPending}
        style={[
          styles.input,
          { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground },
        ]}
        testID="edit-comment"
      />

      <View style={styles.photos}>
        <ReviewPhotos
          photos={photos}
          removing={photoBusy}
          onRemove={(photo) => removePhoto.mutate(photo.id)}
        />
        {remaining > 0 ? (
          <ImagePicker
            images={[]}
            onChange={(chosen) => {
              for (const { uri, fileName, mimeType } of chosen) {
                addPhoto.mutate({ uri, fileName, mimeType })
              }
            }}
            maxImages={remaining}
            disabled={photoBusy}
            label="Adicionar fotos"
          />
        ) : null}
        {addPhoto.isError || removePhoto.isError ? (
          <Text style={[styles.body, { color: colors.destructiveAccent }]} testID="edit-photo-error">
            {failureMessage(addPhoto.error ?? removePhoto.error)}
          </Text>
        ) : null}
      </View>

      {update.isError ? (
        <Text style={[styles.body, { color: colors.destructiveAccent }]} testID="edit-error">
          {failureMessage(update.error)}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: rating < 1 || update.isPending }}
        disabled={rating < 1 || update.isPending}
        onPress={() =>
          update.mutate(
            { rating, comment: comment.trim() || null },
            { onSuccess: () => router.back() }
          )
        }
        style={[styles.action, { backgroundColor: colors.cta, opacity: update.isPending ? 0.5 : 1 }]}
        testID="edit-submit">
        <Text style={[styles.actionLabel, { color: colors.ctaForeground }]}>
          {update.isPending ? 'Salvando…' : 'Salvar alterações'}
        </Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  title: typography.title,
  card: { alignItems: 'center', borderWidth: 1, borderRadius: radius.surface, padding: spacing.lg },
  input: { borderWidth: 1, borderRadius: radius.md, minHeight: 120, padding: spacing.md, textAlignVertical: 'top', ...typography.body },
  body: typography.body,
  photos: { gap: spacing.sm },
  action: { alignItems: 'center', borderRadius: radius.surface, justifyContent: 'center', minHeight: 48, padding: spacing.md },
  actionLabel: { ...typography.body, fontWeight: '700' },
})
