import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useSession } from '@/session/context'
import { ReviewCard } from '@/reviews/review-card'
import { useEstablishmentReviews } from '@/reviews/queries'
import { Stars } from '@/reviews/stars'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const PREVIEW = 3

/**
 * Public reviews of a place (ADR-0027).
 *
 * Reading needs no session, like the rest of discovery. Writing does, so an
 * anonymous visitor is offered the sign-in route rather than a form that would
 * fail on submit.
 *
 * The rating shown in the header is the projection's, not an average of the
 * page that happens to be loaded: with pagination those two numbers disagree,
 * and only one of them is the establishment's actual score.
 */
export function EstablishmentReviews({
  establishmentId,
  summary,
}: {
  establishmentId: number
  summary: { count: number; average: number | null }
}) {
  const colors = useColors()
  const router = useRouter()
  const { status } = useSession()
  const query = useEstablishmentReviews(establishmentId, { perPage: PREVIEW })

  const reviews = query.data?.data ?? []
  const total = summary.count

  return (
    <View
      style={[styles.section, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
      testID="establishment-reviews">
      <View style={styles.header}>
        <Text style={[styles.heading, { color: colors.foreground }]}>Avaliações</Text>
        {summary.average !== null ? (
          <View style={styles.score}>
            <Stars rating={summary.average} />
            <Text style={[styles.average, { color: colors.foreground }]}>
              {summary.average.toFixed(1).replace('.', ',')}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.caption, { color: colors.mutedForeground }]}>
        {total === 0
          ? 'Ainda não há avaliações deste lugar.'
          : total === 1
            ? '1 avaliação publicada'
            : `${total} avaliações publicadas`}
      </Text>

      {query.isError ? (
        <Text style={[styles.caption, { color: colors.mutedForeground }]}>
          Não foi possível carregar as avaliações agora.
        </Text>
      ) : null}

      {/* Reporting needs no session: a visitor files it anonymously. Up to the
          preview size there is no full list to go to, so the entry lives here too. */}
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          onReport={(target) => router.push(`/denunciar/${target.type}/${target.id}`)}
        />
      ))}

      {total > reviews.length && reviews.length > 0 ? (
        <Action
          label={`Ver todas as ${total} avaliações`}
          onPress={() => router.push(`/avaliacoes/${establishmentId}`)}
          secondary
        />
      ) : null}

      <Action
        label={status === 'authenticated' ? 'Avaliar este lugar' : 'Entrar para avaliar'}
        onPress={() =>
          router.push(
            status === 'authenticated' ? `/avaliar/${establishmentId}` : '/(tabs)/sign-in'
          )
        }
      />
    </View>
  )
}

function Action({
  label,
  onPress,
  secondary = false,
}: {
  label: string
  onPress: () => void
  secondary?: boolean
}) {
  const colors = useColors()

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.action,
        secondary
          ? { backgroundColor: colors.actionSecondary, borderColor: colors.actionSecondaryBorder, borderWidth: 1 }
          : { backgroundColor: colors.cta },
      ]}>
      <Text
        style={[
          styles.actionLabel,
          { color: secondary ? colors.actionSecondaryForeground : colors.ctaForeground },
        ]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderWidth: 1, borderRadius: radius.surface },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  score: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  heading: typography.heading,
  average: { ...typography.body, fontWeight: '700' },
  caption: typography.caption,
  action: { alignItems: 'center', borderRadius: radius.surface, justifyContent: 'center', minHeight: 48, padding: spacing.md },
  actionLabel: { ...typography.body, fontWeight: '700', textAlign: 'center' },
})
