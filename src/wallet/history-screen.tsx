import { useQuery } from '@tanstack/react-query'
import { useRouter, type Href } from 'expo-router'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/button'
import { EmptyState } from '@/components/empty-state'
import { ContentSkeleton } from '@/components/content-skeleton'
import { usePullToRefresh } from '@/components/pull-to-refresh'
import { spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { ReceiptCard } from './receipt-card'
import type { History } from './types'

interface Props {
  queryKey: readonly unknown[]
  load: () => Promise<History>
  emptyMessage: string
  /** A sentence on what will appear here, under the empty message. */
  emptyHint?: string
  /** Where an empty history leads, when this actor has somewhere to go (A34). */
  emptyAction?: { label: string; href: Href }
  receiptHref: (code: string) => Href
}

/** Both histories list the same receipts; only the source and the copy differ. */
export function HistoryScreen({
  queryKey,
  load,
  emptyMessage,
  emptyHint,
  emptyAction,
  receiptHref,
}: Props) {
  const colors = useColors()
  const router = useRouter()
  const history = useQuery({ queryKey, queryFn: load })
  const refreshControl = usePullToRefresh(history.refetch)

  if (history.isPending) {
    return <ContentSkeleton label="Carregando histórico" variant="list" />
  }

  if (history.isError) {
    return (
      <View style={[styles.center, styles.fill, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.foreground }]}>
          Não foi possível carregar o histórico agora.
        </Text>
        <Button
          label="Tentar de novo"
          variant="outline"
          icon="refresh"
          onPress={() => void history.refetch()}
        />
      </View>
    )
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={history.data?.redemptions ?? []}
      refreshControl={refreshControl}
      keyExtractor={(item) => item.receipt_code}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Abre o comprovante"
          onPress={() => router.push(receiptHref(item.receipt_code))}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <ReceiptCard receipt={item} compact />
        </Pressable>
      )}
      ListEmptyComponent={
        // The same empty state as every other list of the app (audit A34).
        <EmptyState
          icon="receipt-outline"
          title={emptyMessage}
          text={emptyHint}
          action={
            emptyAction
              ? { label: emptyAction.label, onPress: () => router.navigate(emptyAction.href) }
              : undefined
          }
        />
      }
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.gutter },
  fill: { flex: 1, justifyContent: 'center' },
  center: { alignItems: 'center', gap: spacing.md, padding: spacing.xxl },
  message: { ...typography.body, textAlign: 'center' },
})
