import { useRouter } from 'expo-router'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import { ContentSkeleton } from '@/components/content-skeleton'
import { useDeleteReview, useMyReviews } from '@/reviews/queries'
import { formatDate } from '@/reviews/review-card'
import { Stars } from '@/reviews/stars'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const STATUS_LABEL: Record<string, string> = {
  published: 'Publicada',
  pending_moderation: 'Em moderação',
  hidden: 'Oculta pela moderação',
}

/**
 * The reviews this person wrote.
 *
 * Status is shown as the server reports it: a review held for moderation is
 * not missing and one hidden by a moderator is not deleted, and telling those
 * apart is the whole reason this screen exists rather than a silent list.
 */
export default function MyReviewsScreen() {
  const colors = useColors()
  const router = useRouter()
  const query = useMyReviews({ perPage: 20 })
  const remove = useDeleteReview()

  if (query.isPending) {
    return <ContentSkeleton label="Carregando suas avaliações" variant="catalog" />
  }

  const reviews = query.data?.data ?? []

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={reviews}
      keyExtractor={(review) => String(review.id)}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          {query.isError
            ? 'Não foi possível carregar suas avaliações agora.'
            : 'Você ainda não avaliou nenhum lugar.'}
        </Text>
      }
      renderItem={({ item }) => (
        <View
          style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
          testID={`my-review-${item.id}`}>
          <View style={styles.header}>
            <Stars rating={item.rating} />
            <Text style={[styles.status, { color: colors.mutedForeground }]}>
              {STATUS_LABEL[item.status] ?? item.status}
            </Text>
          </View>

          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatDate(item.created_at)}
            {item.edited_at ? ' · editada' : ''}
          </Text>

          {item.comment ? (
            <Text style={[styles.body, { color: colors.foreground }]}>{item.comment}</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/avaliar/editar/${item.id}`)}
              style={[styles.secondary, { borderColor: colors.actionSecondaryBorder, backgroundColor: colors.actionSecondary }]}>
              <Text style={[styles.secondaryLabel, { color: colors.actionSecondaryForeground }]}>
                Editar
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: remove.isPending }}
              disabled={remove.isPending}
              onPress={() => remove.mutate(item.id)}
              style={[styles.secondary, { borderColor: colors.destructive, backgroundColor: colors.destructiveSoft }]}
              testID={`delete-review-${item.id}`}>
              <Text style={[styles.secondaryLabel, { color: colors.destructiveAccent }]}>
                Excluir
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, padding: spacing.lg },
  card: { borderWidth: 1, borderRadius: radius.surface, gap: spacing.sm, padding: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  status: { ...typography.caption, fontWeight: '600' },
  date: typography.caption,
  body: typography.body,
  empty: { ...typography.body, padding: spacing.lg, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  secondary: { alignItems: 'center', borderWidth: 1, borderRadius: radius.md, flex: 1, justifyContent: 'center', minHeight: 44 },
  secondaryLabel: { ...typography.body, fontWeight: '600' },
})
