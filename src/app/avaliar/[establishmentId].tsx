import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/button'
import { FormTextInput, KeyboardForm } from '@/components/keyboard-form'
import { ApiError } from '@/api/client'
import { ImagePicker, type SelectedImage } from '@/components/image-picker'
import { useAuthorRules, useCreateReviewWithPhotos } from '@/reviews/queries'
import { StarsInput } from '@/reviews/stars'
import { displayWeight, radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const MAX_LENGTH = 4000

/**
 * Writing a review.
 *
 * Every limit that matters — minimum and maximum length, daily limit, whether a
 * visit has to be proved — is tenant policy decided by the server (ADR-0027).
 * The screen does not re-implement any of it: it requires a rating, because
 * there is nothing to submit without one, and reports back what the server
 * answered. A client that guessed the rules would contradict them the day a
 * tenant changed one.
 */
export default function WriteReviewScreen() {
  const colors = useColors()
  const router = useRouter()
  // `nome` is the place, so the form can say what is being reviewed (audit A45).
  const { establishmentId, nome } = useLocalSearchParams<{ establishmentId: string; nome?: string }>()
  const id = Number(establishmentId)

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [photos, setPhotos] = useState<SelectedImage[]>([])
  const rules = useAuthorRules()
  const create = useCreateReviewWithPhotos()
  // The photo limit is the operation's (ADR-0027 scenario 10). Until it is
  // known, and when it is zero, no picker is offered: a picker whose every
  // upload fails is worse than none.
  const maxPhotos = rules.data?.max_photos ?? 0

  const submit = () => {
    if (rating < 1) return
    const text = comment.trim()
    create.mutate(
      {
        body: { establishment_id: id, rating, ...(text ? { comment: text } : {}) },
        photos: photos.map(({ uri, fileName, mimeType }) => ({ uri, fileName, mimeType })),
      },
      { onSuccess: ({ failed }) => (failed === 0 ? router.back() : undefined) }
    )
  }

  if (create.isSuccess && create.data.failed > 0) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background, flex: 1 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Avaliação publicada</Text>
        <Text style={[styles.error, { color: colors.destructiveAccent }]} testID="review-photos-failed">
          {create.data.failed === 1
            ? 'Uma foto não pôde ser enviada.'
            : `${create.data.failed} fotos não puderam ser enviadas.`}{' '}
          Você pode tentar de novo editando a avaliação.
        </Text>
        <Button label="Voltar" size={52} fill onPress={() => router.back()} />
      </View>
    )
  }

  return (
    <KeyboardForm style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      {nome ? <ReviewSubject name={nome} /> : null}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <Text style={[styles.label, { color: colors.foreground }]}>Sua nota</Text>
        <StarsInput rating={rating} onChange={setRating} disabled={create.isPending} />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>Conte como foi (opcional)</Text>
        <FormTextInput
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={MAX_LENGTH}
          editable={!create.isPending}
          placeholder="O que você quer que outras pessoas saibam sobre este lugar?"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground },
          ]}
          testID="review-comment"
        />
      </View>

      {maxPhotos > 0 ? (
        <ImagePicker
          images={photos}
          onChange={setPhotos}
          maxImages={maxPhotos}
          disabled={create.isPending}
          label={`Fotos (até ${maxPhotos})`}
        />
      ) : null}

      {create.isError ? (
        <Text style={[styles.error, { color: colors.destructiveAccent }]} testID="review-error">
          {failureMessage(create.error)}
        </Text>
      ) : null}

      <Button
        label={create.isPending ? 'Enviando…' : 'Publicar avaliação'}
        size={52}
        fill
        disabled={rating < 1 || create.isPending}
        onPress={submit}
        testID="review-submit"
      />

      <Text style={[styles.note, { color: colors.mutedForeground }]}>
        Sua avaliação e as fotos aparecem na hora. Se alguém denunciar, a moderação pode
        ocultá-las. A localização e os dados do aparelho são removidos das fotos antes de
        publicar.
      </Text>
    </KeyboardForm>
  )
}

/** What is being reviewed, under a header that already says "Avaliar". */
export function ReviewSubject({ name }: { name: string }) {
  const colors = useColors()
  return (
    <View style={styles.subject} testID="review-subject">
      <Text style={[styles.overline, { color: colors.mutedForeground }]}>Sua avaliação de</Text>
      <Text style={[styles.subjectName, { color: colors.foreground }]}>{name}</Text>
    </View>
  )
}

/**
 * The server states the rule it enforced; repeating its message is more useful
 * than a generic failure, and it stays correct when the policy changes.
 */
export function failureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'Você já avaliou este lugar. Edite a avaliação existente.'
    const message = (error.body as { message?: string } | undefined)?.message
    if (error.status === 400 && message) return message
    if (error.status === 422) return 'Confira a nota e o texto informados.'
    if (error.status === 429) return 'Muitas tentativas. Tente novamente em instantes.'
  }
  return 'Não foi possível enviar sua avaliação agora.'
}

const styles = StyleSheet.create({
  page: { gap: spacing.xl, padding: spacing.gutter, paddingBottom: spacing.xxl },
  title: typography.title,
  subject: { gap: spacing.xs },
  overline: typography.overline,
  subjectName: { ...typography.heading, ...displayWeight('800') },
  card: { alignItems: 'center', borderWidth: 1, borderRadius: radius.card, gap: spacing.sm, padding: spacing.lg },
  field: { gap: spacing.sm },
  label: { ...typography.label, ...textWeight('700') },
  input: { borderWidth: 1, borderRadius: radius.thumb, minHeight: 120, padding: spacing.md, textAlignVertical: 'top', ...typography.body },
  error: typography.body,
  note: typography.meta,
})
