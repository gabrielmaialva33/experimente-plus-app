import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { Review } from '@/api/reviews'
import { Stars } from '@/reviews/stars'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * A published review, and the partner's reply when there is one.
 *
 * The date is the one the server sent. Nothing here is recomputed locally: a
 * review edited an hour ago and one written a year ago look different, and the
 * device's clock is not the authority on which is which.
 */
export function ReviewCard({
  review,
  onReport,
}: {
  review: Review
  onReport?: (target: { type: 'review' | 'reply'; id: number }) => void
}) {
  const colors = useColors()
  const author = review.author?.full_name ?? 'Visitante'

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surfaceBase, borderColor: colors.border }]}
      testID={`review-${review.id}`}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text style={[styles.author, { color: colors.foreground }]} numberOfLines={1}>
            {author}
          </Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatDate(review.created_at)}
            {review.edited_at ? ' · editado' : ''}
          </Text>
        </View>
        <Stars rating={review.rating} />
      </View>

      {review.comment ? (
        <Text style={[styles.body, { color: colors.foreground }]}>{review.comment}</Text>
      ) : null}

      {review.photos_count > 0 ? (
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {review.photos_count === 1 ? '1 foto' : `${review.photos_count} fotos`}
        </Text>
      ) : null}

      {review.reply ? (
        <View style={[styles.reply, { borderColor: colors.border }]}>
          <Text style={[styles.replyLabel, { color: colors.primaryAccent }]}>
            Resposta do estabelecimento
          </Text>
          <Text style={[styles.body, { color: colors.foreground }]}>{review.reply.comment}</Text>
          {onReport ? (
            <ReportLink
              onPress={() => onReport({ type: 'reply', id: review.reply!.id })}
              label="Denunciar resposta"
            />
          ) : null}
        </View>
      ) : null}

      {onReport ? (
        <ReportLink
          onPress={() => onReport({ type: 'review', id: review.id })}
          label="Denunciar avaliação"
        />
      ) : null}
    </View>
  )
}

function ReportLink({ onPress, label }: { onPress: () => void; label: string }) {
  const colors = useColors()

  return (
    <Pressable accessibilityRole="button" hitSlop={spacing.sm} onPress={onPress} style={styles.report}>
      <Text style={[styles.reportLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </Pressable>
  )
}

/** Dates arrive as ISO strings in UTC; only the calendar day is shown. */
export function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, gap: spacing.sm, padding: spacing.md },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  identity: { flex: 1, gap: 2 },
  author: { ...typography.body, fontWeight: '600' },
  date: typography.caption,
  body: typography.body,
  reply: { borderLeftWidth: 2, gap: spacing.xs, paddingLeft: spacing.md },
  replyLabel: { ...typography.caption, fontWeight: '700' },
  report: { minHeight: 32, justifyContent: 'center' },
  reportLabel: { ...typography.caption, textDecorationLine: 'underline' },
})
