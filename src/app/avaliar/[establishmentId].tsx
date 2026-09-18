import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { ApiError } from '@/api/client'
import { useCreateReview } from '@/reviews/queries'
import { StarsInput } from '@/reviews/stars'
import { radius, spacing, typography } from '@/theme/tokens'
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
  const { establishmentId } = useLocalSearchParams<{ establishmentId: string }>()
  const id = Number(establishmentId)

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const create = useCreateReview()

  const submit = () => {
    if (rating < 1) return
    const text = comment.trim()
    create.mutate(
      { establishment_id: id, rating, ...(text ? { comment: text } : {}) },
      { onSuccess: () => router.back() }
    )
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <Text style={[styles.title, { color: colors.foreground }]}>Sua avaliação</Text>

      <View style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <StarsInput rating={rating} onChange={setRating} disabled={create.isPending} />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Conte como foi (opcional)
        </Text>
        <TextInput
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

      {create.isError ? (
        <Text style={[styles.error, { color: colors.destructiveAccent }]} testID="review-error">
          {failureMessage(create.error)}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: rating < 1 || create.isPending }}
        disabled={rating < 1 || create.isPending}
        onPress={submit}
        style={[
          styles.action,
          { backgroundColor: colors.cta, opacity: rating < 1 || create.isPending ? 0.5 : 1 },
        ]}
        testID="review-submit">
        <Text style={[styles.actionLabel, { color: colors.ctaForeground }]}>
          {create.isPending ? 'Enviando…' : 'Publicar avaliação'}
        </Text>
      </Pressable>

      <Text style={[styles.note, { color: colors.mutedForeground }]}>
        Dependendo das regras desta operação, sua avaliação pode passar por moderação antes de
        aparecer publicamente.
      </Text>
    </ScrollView>
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
  page: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  title: typography.title,
  card: { alignItems: 'center', borderWidth: 1, borderRadius: radius.surface, padding: spacing.lg },
  field: { gap: spacing.xs },
  label: typography.caption,
  input: { borderWidth: 1, borderRadius: radius.md, minHeight: 120, padding: spacing.md, textAlignVertical: 'top', ...typography.body },
  error: typography.body,
  note: typography.caption,
  action: { alignItems: 'center', borderRadius: radius.surface, justifyContent: 'center', minHeight: 48, padding: spacing.md },
  actionLabel: { ...typography.body, fontWeight: '700' },
})
