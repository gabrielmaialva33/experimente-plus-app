import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native'

import { Chip } from '@/components/chip'
import { ContentSkeleton } from '@/components/content-skeleton'
import { ReviewCard } from '@/reviews/review-card'
import { reportHref } from '@/reviews/report-link'
import { useEstablishmentReviews } from '@/reviews/queries'
import { displayWeight, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const PER_PAGE = 20
const FILTERS = [null, 5, 4, 3, 2, 1] as const

const filterLabel = (value: (typeof FILTERS)[number]) =>
  value === null ? 'Todas' : value === 1 ? '1 estrela' : `${value} estrelas`

/** Every published review of one place, newest first — the order the API fixes. */
export default function EstablishmentReviewsScreen() {
  const colors = useColors()
  const router = useRouter()
  // `nome` is the place: the header says "Avaliações", the page says of what.
  const { establishmentId, nome } = useLocalSearchParams<{ establishmentId: string; nome?: string }>()
  const id = Number(establishmentId)

  const [rating, setRating] = useState<number | null>(null)
  const query = useEstablishmentReviews(id, {
    perPage: PER_PAGE,
    ...(rating ? { rating } : {}),
  })

  const reviews = query.data?.data ?? []

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        {nome ? (
          <Text accessibilityRole="header" style={[styles.place, { color: colors.foreground }]}>
            {nome}
          </Text>
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filters}
          contentContainerStyle={styles.filtersContent}>
          {FILTERS.map((value) => (
            <Chip
              key={value ?? 'all'}
              label={filterLabel(value)}
              selected={rating === value}
              onPress={() => setRating(value)}
            />
          ))}
        </ScrollView>
      </View>

      {query.isPending ? (
        <ContentSkeleton label="Carregando avaliações" variant="catalog" />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(review) => String(review.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ReviewCard
              review={item}
              establishmentName={nome}
              onReport={(target) => router.push(reportHref(target.type, target.id, target.subject))}
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              {query.isError
                ? 'Não foi possível carregar as avaliações agora.'
                : rating
                  ? 'Nenhuma avaliação com essa nota.'
                  : 'Ainda não há avaliações deste lugar.'}
            </Text>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  top: { gap: spacing.md, paddingTop: spacing.lg },
  place: { ...typography.title, ...displayWeight('800'), paddingHorizontal: spacing.gutter },
  // The row scrolls to the screen's edge; the gutter is its first inset.
  filters: { flexGrow: 0 },
  filtersContent: { gap: spacing.sm, paddingHorizontal: spacing.gutter },
  list: { gap: spacing.md, padding: spacing.gutter, paddingTop: spacing.md },
  empty: { ...typography.body, padding: spacing.lg, textAlign: 'center' },
})
