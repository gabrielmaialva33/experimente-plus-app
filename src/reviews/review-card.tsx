import { StyleSheet, Text, View } from 'react-native'

import type { Review } from '@/api/reviews'
import { ActionMenu } from '@/components/action-menu'
import { ReviewPhotos } from '@/reviews/review-photos'
import { Stars } from '@/reviews/stars'
import { displayWeight, radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export interface ReportTarget {
  type: 'review' | 'reply'
  id: number
  /** What the report form names (audit A45): "Avaliação de Ana Ribeiro". */
  subject: string
}

const initials = (name: string) => {
  const words = name.split(/\s+/).filter(Boolean)
  return [words[0], words.length > 1 ? words[words.length - 1] : undefined]
    .map((word) => word?.[0] ?? '')
    .join('')
    .toUpperCase()
}

/**
 * A published review, and the partner's reply when there is one.
 *
 * The date is the one the server sent. Nothing here is recomputed locally: a
 * review edited an hour ago and one written a year ago look different, and the
 * device's clock is not the authority on which is which.
 *
 * Reporting the review or its reply sits behind one "⋯" (audit A32).
 */
export function ReviewCard({
  review,
  onReport,
  establishmentName,
}: {
  review: Review
  onReport?: (target: ReportTarget) => void
  /** Names the reply: "Resposta de Ateliê do Café". */
  establishmentName?: string
}) {
  const colors = useColors()
  const author = review.author?.full_name ?? 'Visitante'
  const reply = review.reply

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
      testID={`review-${review.id}`}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={[styles.initials, { color: colors.primaryAccent }]}>{initials(author)}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={[styles.author, { color: colors.foreground }]} numberOfLines={1}>
            {author}
          </Text>
          <View style={styles.meta}>
            <Stars rating={review.rating} size={14} />
            <Text style={[styles.date, { color: colors.mutedForeground }]}>
              {formatDate(review.created_at)}
              {review.edited_at ? ' · editado' : ''}
            </Text>
          </View>
        </View>
        {onReport ? (
          <ActionMenu
            accessibilityLabel={`Mais opções da avaliação de ${author}`}
            title={`Avaliação de ${author}`}
            tone="plain"
            items={[
              {
                label: 'Denunciar avaliação',
                icon: 'flag-outline',
                onPress: () => onReport({ type: 'review', id: review.id, subject: `Avaliação de ${author}` }),
              },
              ...(reply
                ? [{
                    label: 'Denunciar resposta',
                    icon: 'flag-outline' as const,
                    onPress: () => onReport({ type: 'reply', id: reply.id, subject: `Resposta à avaliação de ${author}` }),
                  }]
                : []),
            ]}
          />
        ) : null}
      </View>

      {review.comment ? (
        <Text style={[styles.body, { color: colors.foreground }]}>{review.comment}</Text>
      ) : null}

      <ReviewPhotos photos={review.photos ?? []} />

      {reply ? (
        <View style={[styles.reply, { backgroundColor: colors.background }]}>
          <Text style={[styles.replyLabel, { color: colors.primaryAccent }]}>
            {establishmentName ? `Resposta de ${establishmentName}` : 'Resposta do lugar'}
          </Text>
          <Text style={[styles.replyBody, { color: colors.foreground }]}>{reply.comment}</Text>
        </View>
      ) : null}
    </View>
  )
}

/** Dates arrive as ISO strings in UTC; only the calendar day is shown. */
export function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, gap: 10, padding: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  avatar: { alignItems: 'center', borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  initials: { ...typography.label, ...displayWeight('800') },
  identity: { flex: 1, gap: 2 },
  author: { ...typography.label, ...textWeight('700') },
  meta: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  date: typography.caption,
  body: { ...typography.body, fontSize: 15, lineHeight: 22 },
  reply: { borderRadius: 14, gap: spacing.xs, paddingHorizontal: 14, paddingVertical: spacing.md },
  replyLabel: { ...typography.caption, ...textWeight('700') },
  replyBody: { ...typography.meta, lineHeight: 20 },
})
