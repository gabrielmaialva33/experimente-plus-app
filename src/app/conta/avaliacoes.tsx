import { useRouter } from 'expo-router'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import { Badge, type BadgeTone } from '@/components/badge'
import { Button } from '@/components/button'
import { ContentSkeleton } from '@/components/content-skeleton'
import { EmptyState } from '@/components/empty-state'
import { usePullToRefresh } from '@/components/pull-to-refresh'
import { useDeleteReview, useMyReviews } from '@/reviews/queries'
import { formatDate } from '@/reviews/review-card'
import { Stars } from '@/reviews/stars'
import { minTouch, radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

// The statuses the server has: `pending_moderation` never existed — the API
// document advertised it — and `archived`, which a deleted review has, fell
// through to its raw value.
const STATUS_LABEL: Record<string, string> = {
  published: 'Publicada',
  hidden: 'Oculta pela moderação',
  archived: 'Excluída',
}

/**
 * A review an automatic rule is holding is `hidden` too, but nobody has decided
 * about it yet. Calling it "hidden by moderation" would tell the author a
 * person judged it, which has not happened.
 */
const statusLabel = (review: { status: string; awaiting_moderation?: boolean }) =>
  review.awaiting_moderation ? 'Em análise' : (STATUS_LABEL[review.status] ?? review.status)

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
  const refreshControl = usePullToRefresh(query.refetch)

  if (query.isPending) {
    return <ContentSkeleton label="Carregando suas avaliações" variant="catalog" />
  }

  const reviews = query.data?.data ?? []

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={reviews}
      refreshControl={refreshControl}
      keyExtractor={(review) => String(review.id)}
      ListEmptyComponent={
        query.isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Não foi possível carregar suas avaliações agora"
            action={{ label: 'Tentar de novo', onPress: () => void query.refetch() }}
          />
        ) : (
          // Audit A34: an empty list says what goes here and where to start.
          <EmptyState
            icon="star-outline"
            title="Nenhuma avaliação ainda"
            text="Você ainda não avaliou nenhum lugar."
            action={{ label: 'Explorar lugares', onPress: () => router.navigate('/') }}
          />
        )
      }
      renderItem={({ item }) => (
        <View
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
          testID={`my-review-${item.id}`}>
          <View style={styles.header}>
            <Stars rating={item.rating} />
            <Badge label={statusLabel(item)} tone={statusTone(item)} />
          </View>

          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatDate(item.created_at)}
            {item.edited_at ? ' · editada' : ''}
          </Text>

          {item.comment ? (
            <Text style={[styles.body, { color: colors.foreground }]}>{item.comment}</Text>
          ) : null}

          <View style={styles.actions}>
            <Button
              label="Editar"
              icon="create-outline"
              variant="outline"
              size={44}
              onPress={() => router.push(`/avaliar/editar/${item.id}`)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Excluir"
              accessibilityState={{ disabled: remove.isPending }}
              disabled={remove.isPending}
              onPress={() => remove.mutate(item.id)}
              style={styles.delete}
              testID={`delete-review-${item.id}`}>
              <Text style={[styles.deleteLabel, { color: colors.destructiveAccent }]}>Excluir</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  )
}

/** Only a published review is public; one held or hidden is not, and says so in amber. */
const statusTone = (review: { status: string; awaiting_moderation?: boolean }): BadgeTone =>
  review.status === 'published' && !review.awaiting_moderation
    ? 'success'
    : review.status === 'archived'
      ? 'neutral'
      : 'warning'

const styles = StyleSheet.create({
  list: { gap: spacing.md, padding: spacing.gutter, paddingBottom: spacing.xxl },
  card: { borderWidth: 1, borderRadius: radius.card, gap: spacing.sm, padding: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  date: typography.meta,
  body: typography.body,
  actions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', paddingTop: spacing.xs },
  delete: { justifyContent: 'center', minHeight: minTouch, paddingHorizontal: spacing.md },
  deleteLabel: { ...typography.label, ...textWeight('700') },
})
