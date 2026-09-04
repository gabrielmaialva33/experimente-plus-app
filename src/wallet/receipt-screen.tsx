import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'

import { spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { ReceiptCard } from './receipt-card'
import type { Receipt } from './types'

/**
 * A receipt that does not exist, or that this actor may not open, is reported as
 * unavailable without revealing whether it belongs to someone else (ADR-0021).
 */
export function ReceiptScreen({
  queryKey,
  load,
}: {
  queryKey: readonly unknown[]
  load: () => Promise<Receipt>
}) {
  const colors = useColors()
  const receipt = useQuery({ queryKey, queryFn: load, retry: false })

  if (receipt.isPending) {
    return <ActivityIndicator style={styles.center} color={colors.primary} />
  }

  if (receipt.isError || !receipt.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.foreground }]}>
          Este comprovante não está disponível.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <ReceiptCard receipt={receipt.data} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.xxl },
  message: { ...typography.body, textAlign: 'center' },
})
