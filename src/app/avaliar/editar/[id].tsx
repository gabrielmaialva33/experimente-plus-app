import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { announce, useAnnouncement } from '@/components/announce'
import { Button } from '@/components/button'
import { ContentSkeleton } from '@/components/content-skeleton'
import { EmptyState } from '@/components/empty-state'
import { FormTextInput, KeyboardForm } from '@/components/keyboard-form'
import { ReviewSubject, failureMessage } from '@/app/avaliar/[establishmentId]'
import type { Review } from '@/api/reviews'
import { ImagePicker } from '@/components/image-picker'
import { useContentFrame } from '@/components/content-frame'
import { TROUBLESHOOTING_HELP } from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAuthorRules,
  useMyReviews,
  useRemoveReviewPhoto,
  useUpdateReview,
} from '@/reviews/queries'
import { ReviewPhotos } from '@/reviews/review-photos'
import { StarsInput } from '@/reviews/stars'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
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
  const frame = useContentFrame()
  const router = useRouter()
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>()
  const reviewId = Number(id)

  // Same page size as the listing this screen is opened from, so the review is
  // already in the cache and editing does not wait on a second request. There is
  // no route that fetches one of the author's own reviews by id.
  const mine = useMyReviews({ perPage: 20 })
  const review = mine.data?.data.find((item) => item.id === reviewId)

  if (mine.isPending) {
    return <ContentSkeleton label="Carregando sua avaliação" variant="detail" />
  }

  if (!review) {
    // A list that did not load says nothing about the review; one that loaded without it does.
    return (
      <View style={[styles.center, frame.padding, { backgroundColor: colors.background }]}>
        {mine.isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Não foi possível carregar sua avaliação agora"
            action={{ label: 'Tentar de novo', onPress: () => void mine.refetch() }}
            help={TROUBLESHOOTING_HELP}
          />
        ) : (
          <EmptyState
            icon="star-outline"
            title="Esta avaliação não está mais disponível"
            action={{ label: 'Voltar', onPress: () => router.back() }}
          />
        )}
      </View>
    )
  }

  // Keyed by the review: the form's initial state is the review that was
  // loaded, so it is set once when that review arrives and never synchronised
  // back and forth by an effect.
  return <EditForm key={review.id} review={review} place={nome} />
}

function EditForm({ review, place }: { review: Review; place?: string }) {
  const colors = useColors()
  const frame = useContentFrame()
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
  useAnnouncement(
    addPhoto.isError || removePhoto.isError
      ? failureMessage(addPhoto.error ?? removePhoto.error)
      : update.isError && failureMessage(update.error)
  )

  return (
    <KeyboardForm
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.page, frame.padding]}
    >
      {/* The header already says "Editar avaliação" (audit A45); the page names the place. */}
      {place ? <ReviewSubject name={place} /> : null}

      <View
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
      >
        <Text style={[styles.label, { color: colors.foreground }]}>Sua nota</Text>
        <StarsInput
          label="Sua nota"
          rating={rating}
          onChange={setRating}
          disabled={update.isPending}
        />
      </View>

      <Text style={[styles.label, { color: colors.foreground }]}>Seu comentário</Text>
      <FormTextInput
        accessibilityLabel="Seu comentário"
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
          <Text
            style={[styles.body, { color: colors.destructiveAccent }]}
            testID="edit-photo-error"
          >
            {failureMessage(addPhoto.error ?? removePhoto.error)}
          </Text>
        ) : null}
      </View>

      {update.isError ? (
        <Text style={[styles.body, { color: colors.destructiveAccent }]} testID="edit-error">
          {failureMessage(update.error)}
        </Text>
      ) : null}

      <Button
        label={update.isPending ? 'Salvando…' : 'Salvar alterações'}
        size={52}
        fill
        disabled={rating < 1 || update.isPending}
        onPress={() =>
          update.mutate(
            { rating, comment: comment.trim() || null },
            {
              onSuccess: (saved) => {
                // The form closes on success, so the outcome is said.
                announce(
                  saved.status === 'published'
                    ? 'Avaliação atualizada.'
                    : 'Avaliação atualizada. Por enquanto ela não aparece no lugar.'
                )
                router.back()
              },
            }
          )
        }
        testID="edit-submit"
      />
    </KeyboardForm>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.xl, padding: spacing.gutter, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', paddingVertical: spacing.xxl },
  card: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.card,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  label: { ...typography.label, ...textWeight('700') },
  input: {
    borderWidth: 1,
    borderRadius: radius.thumb,
    marginTop: -spacing.md,
    minHeight: 120,
    padding: spacing.md,
    textAlignVertical: 'top',
    ...typography.body,
  },
  body: typography.body,
  photos: { gap: spacing.sm },
})
