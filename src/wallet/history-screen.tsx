import { useQuery } from '@tanstack/react-query'
import { useRouter, type Href } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import { spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { ReceiptCard } from './receipt-card'
import type { History } from './types'

interface Props {
  queryKey: readonly unknown[]
  load: () => Promise<History>
  emptyMessage: string
  receiptHref: (code: string) => Href
}

/** Both histories list the same receipts; only the source and the copy differ. */
export function HistoryScreen({ queryKey, load, emptyMessage, receiptHref }: Props) {
  const colors = useColors()
  const router = useRouter()
  const history = useQuery({ queryKey, queryFn: load })

  if (history.isPending) {
    return <ActivityIndicator style={styles.center} color={colors.primary} />
  }

  if (history.isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.foreground }]}>
          Não foi possível carregar o histórico agora.
        </Text>
        <Pressable onPress={() => history.refetch()}>
          <Text style={[styles.link, { color: colors.primary }]}>Tentar de novo</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={history.data?.redemptions ?? []}
      keyExtractor={(item) => item.receipt_code}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(receiptHref(item.receipt_code))}>
          <ReceiptCard receipt={item} compact />
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>{emptyMessage}</Text>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  center: { alignItems: 'center', gap: spacing.md, padding: spacing.xxl },
  message: { ...typography.body, textAlign: 'center' },
  link: { ...typography.body, fontWeight: '700' },
})
