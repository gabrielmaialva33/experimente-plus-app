import { useRouter } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/button'
import { SectionHeader } from '@/components/section-header'
import { useSession } from '@/session/context'
import { ReviewCard } from '@/reviews/review-card'
import { reportHref } from '@/reviews/report-link'
import { useEstablishmentReviews } from '@/reviews/queries'
import { Stars } from '@/reviews/stars'
import { spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const PREVIEW = 3

/** A route that carries the place's name, so the next screen can say it (audit A45). */
const named = (path: string, name?: string) => (name ? `${path}?nome=${encodeURIComponent(name)}` : path)

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
  establishmentName,
  summary,
}: {
  establishmentId: number
  establishmentName?: string
  summary: { count: number; average: number | null }
}) {
  const colors = useColors()
  const router = useRouter()
  const { status } = useSession()
  const query = useEstablishmentReviews(establishmentId, { perPage: PREVIEW })

  const reviews = query.data?.data ?? []
  const total = summary.count
  const more = total > reviews.length && reviews.length > 0

  return (
    <View style={styles.section} testID="establishment-reviews">
      <SectionHeader
        title="Avaliações"
        action={
          more
            ? {
                label: 'Ver todas',
                accessibilityLabel: `Ver todas as ${total} avaliações`,
                onPress: () => router.push(named(`/avaliacoes/${establishmentId}`, establishmentName)),
              }
            : undefined
        }
      />

      {total === 0 ? (
        <Text style={[styles.count, { color: colors.mutedForeground }]}>Ainda não há avaliações deste lugar.</Text>
      ) : (
        <View style={styles.score}>
          {summary.average !== null ? (
            <>
              <Stars rating={summary.average} />
              <Text style={[styles.average, { color: colors.foreground }]}>
                {summary.average.toFixed(1).replace('.', ',')}
              </Text>
            </>
          ) : null}
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {total === 1 ? '1 avaliação publicada' : `${total} avaliações publicadas`}
          </Text>
        </View>
      )}

      {query.isError ? (
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          Não foi possível carregar as avaliações agora.
        </Text>
      ) : null}

      {/* Reporting needs no session: a visitor files it anonymously. Up to the
          preview size there is no full list to go to, so the entry lives here too. */}
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          establishmentName={establishmentName}
          onReport={(target) => router.push(reportHref(target.type, target.id, target.subject))}
        />
      ))}

      <Button
        label={status === 'authenticated' ? 'Avaliar este lugar' : 'Entrar para avaliar'}
        variant="outline"
        fill
        onPress={() =>
          router.push(
            status === 'authenticated'
              ? named(`/avaliar/${establishmentId}`, establishmentName)
              : '/(tabs)/sign-in'
          )
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  score: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  average: { ...typography.label, ...textWeight('700') },
  count: typography.meta,
})
