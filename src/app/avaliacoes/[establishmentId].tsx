import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native'

import { Chip } from '@/components/chip'
import { ContentSkeleton } from '@/components/content-skeleton'
import { EmptyState } from '@/components/empty-state'
import { usePullToRefresh } from '@/components/pull-to-refresh'
import { useContentFrame } from '@/components/content-frame'
import { TROUBLESHOOTING_HELP } from '@/help/help-link'
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
  const frame = useContentFrame()
  // `nome` is the place: the header says "Avaliações", the page says of what.
  const { establishmentId, nome } = useLocalSearchParams<{
    establishmentId: string
    nome?: string
  }>()
  const id = Number(establishmentId)

  const [rating, setRating] = useState<number | null>(null)
  const query = useEstablishmentReviews(id, {
    perPage: PER_PAGE,
    ...(rating ? { rating } : {}),
  })

  const refreshControl = usePullToRefresh(query.refetch)

  const reviews = query.data?.data ?? []

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        {nome ? (
          <Text
            accessibilityRole="header"
            style={[styles.place, frame.padding, { color: colors.foreground }]}
          >
            {nome}
          </Text>
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filters}
          contentContainerStyle={[styles.filtersContent, frame.padding]}
        >
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
          contentContainerStyle={[styles.list, frame.padding]}
          refreshControl={refreshControl}
          renderItem={({ item }) => (
            <ReviewCard
              review={item}
              establishmentName={nome}
              onReport={(target) => router.push(reportHref(target.type, target.id, target.subject))}
            />
          )}
          ListEmptyComponent={
            query.isError ? (
              <EmptyState
                icon="cloud-offline-outline"
                title="Não foi possível carregar as avaliações agora"
                action={{ label: 'Tentar de novo', onPress: () => void query.refetch() }}
                help={TROUBLESHOOTING_HELP}
              />
            ) : rating ? (
              // A filter that empties the list offers the way back to every review.
              <EmptyState
                icon="star-outline"
                title="Nenhuma avaliação com essa nota"
                action={{ label: 'Ver todas', onPress: () => setRating(null) }}
              />
            ) : (
              <EmptyState
                icon="star-outline"
                title="Ainda não há avaliações deste lugar"
                action={{ label: 'Voltar ao lugar', onPress: () => router.back() }}
              />
            )
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  top: { gap: spacing.md, paddingTop: spacing.lg },
  place: { ...typography.title, ...displayWeight('800') },
  // The row scrolls to the screen's edge; the column's edge is its first inset.
  filters: { flexGrow: 0 },
  filtersContent: { gap: spacing.sm },
  list: { gap: spacing.md, padding: spacing.gutter, paddingTop: spacing.md },
})
