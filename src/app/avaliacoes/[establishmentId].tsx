import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import { ContentSkeleton } from '@/components/content-skeleton'
import { ReviewCard } from '@/reviews/review-card'
import { useEstablishmentReviews } from '@/reviews/queries'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const PER_PAGE = 20
const FILTERS = [null, 5, 4, 3, 2, 1] as const

/** Every published review of one place, newest first — the order the API fixes. */
export default function EstablishmentReviewsScreen() {
  const colors = useColors()
  const router = useRouter()
  const { establishmentId } = useLocalSearchParams<{ establishmentId: string }>()
  const id = Number(establishmentId)

  const [rating, setRating] = useState<number | null>(null)
  const query = useEstablishmentReviews(id, {
    perPage: PER_PAGE,
    ...(rating ? { rating } : {}),
  })

  const reviews = query.data?.data ?? []

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={styles.filters}>
        {FILTERS.map((value) => (
          <Pressable
            key={value ?? 'all'}
            accessibilityRole="radio"
            accessibilityState={{ selected: rating === value }}
            onPress={() => setRating(value)}
            style={[
              styles.filter,
              {
                backgroundColor: rating === value ? colors.choiceSelected : colors.choiceBackground,
                borderColor: rating === value ? colors.primary : colors.border,
              },
            ]}>
            <Text style={[styles.filterLabel, { color: colors.foreground }]}>
              {value === null ? 'Todas' : `${value}★`}
            </Text>
          </Pressable>
        ))}
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
              onReport={(target) => router.push(`/denunciar/${target.type}/${target.id}`)}
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
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.sm },
  filter: { borderWidth: 1, borderRadius: radius.pill, justifyContent: 'center', minHeight: 40, paddingHorizontal: spacing.md },
  filterLabel: { ...typography.caption, fontWeight: '600' },
  list: { gap: spacing.md, padding: spacing.lg, paddingTop: spacing.sm },
  empty: { ...typography.body, padding: spacing.lg, textAlign: 'center' },
})
