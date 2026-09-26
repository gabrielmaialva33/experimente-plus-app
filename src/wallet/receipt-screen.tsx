import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { ContentSkeleton } from '@/components/content-skeleton'
import { radius, spacing, typography } from '@/theme/tokens'
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
    return <ContentSkeleton label="Carregando comprovante" variant="detail" />
  }

  if (receipt.isError || !receipt.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.mark, { backgroundColor: colors.muted }]}>
          <Ionicons name="document-outline" size={26} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.message, { color: colors.foreground }]}>
          Este comprovante não está disponível.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>Utilização registrada</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Cliente e parceiro veem este mesmo comprovante.
        </Text>
      </View>
      <ReceiptCard receipt={receipt.data} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg, padding: spacing.gutter },
  head: { gap: spacing.xs },
  title: typography.title,
  hint: typography.meta,
  center: { alignItems: 'center', flex: 1, gap: spacing.lg, justifyContent: 'center', padding: spacing.xxl },
  mark: { alignItems: 'center', borderRadius: radius.pill, height: 56, justifyContent: 'center', width: 56 },
  message: { ...typography.body, textAlign: 'center' },
})
