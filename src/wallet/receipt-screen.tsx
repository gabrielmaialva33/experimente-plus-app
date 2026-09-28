import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { ApiError } from '@/api/client'
import { ContentSkeleton } from '@/components/content-skeleton'
import { EmptyState } from '@/components/empty-state'
import { useContentFrame } from '@/components/content-frame'
import { TROUBLESHOOTING_HELP } from '@/help/help-link'
import { spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { ReceiptCard } from './receipt-card'
import type { Receipt } from './types'

/**
 * A receipt that does not exist, or that this actor may not open, is reported as
 * unavailable without revealing whether it belongs to someone else (ADR-0021).
 * A read that did not reach an answer is a different thing, and can be retried.
 */
export function ReceiptScreen({
  queryKey,
  load,
}: {
  queryKey: readonly unknown[]
  load: () => Promise<Receipt>
}) {
  const colors = useColors()
  const frame = useContentFrame()
  const router = useRouter()
  const receipt = useQuery({ queryKey, queryFn: load, retry: false })

  if (receipt.isPending) {
    return <ContentSkeleton label="Carregando comprovante" variant="detail" />
  }

  const refused =
    receipt.error instanceof ApiError && receipt.error.status >= 400 && receipt.error.status < 500
  if (receipt.isError && !refused) {
    return (
      <View style={[styles.center, frame.padding, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Não foi possível carregar o comprovante agora"
          action={{ label: 'Tentar de novo', onPress: () => void receipt.refetch() }}
          help={TROUBLESHOOTING_HELP}
        />
      </View>
    )
  }

  if (receipt.isError || !receipt.data) {
    return (
      <View style={[styles.center, frame.padding, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="document-outline"
          title="Este comprovante não está disponível."
          action={
            router.canGoBack() ? { label: 'Voltar', onPress: () => router.back() } : undefined
          }
        />
      </View>
    )
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.page, frame.padding]}
    >
      <View style={styles.head}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
          Utilização registrada
        </Text>
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
  center: { flex: 1, justifyContent: 'center', paddingVertical: spacing.xxl },
})
