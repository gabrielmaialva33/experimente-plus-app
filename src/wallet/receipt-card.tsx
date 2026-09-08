import { StyleSheet, Text, View } from 'react-native'

import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import type { Receipt } from './types'

/**
 * One receipt, one shape.
 *
 * UC-M05 requires the consumer and the partner to open the same snapshot of
 * edition, offer, terms, unit, holder and date — so both sides render this.
 */
export function ReceiptCard({ receipt, compact = false }: { receipt: Receipt; compact?: boolean }) {
  const colors = useColors()
  const when = new Date(receipt.redeemed_at)

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.code, { color: colors.foreground }]}>{receipt.receipt_code}</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{receipt.offer.title}</Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {receipt.establishment.name}
      </Text>

      {compact ? null : (
        <>
          <Row label="Edição" value={receipt.edition.name} />
          <Row label="Titular" value={receipt.holder.full_name} />
          <Row label="Uso número" value={String(receipt.redemption_number)} />
          {receipt.offer.terms ? <Row label="Regras" value={receipt.offer.terms} /> : null}
        </>
      )}

      {/* Explicit timezone: the same instant must not read as a different day
          depending on where the device is. */}
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {new Intl.DateTimeFormat('pt-BR', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'America/Sao_Paulo',
        }).format(when)}
      </Text>
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const colors = useColors()

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.surface,
    borderWidth: 1,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  code: { ...typography.caption, fontWeight: '700', letterSpacing: 1 },
  title: { ...typography.body, fontWeight: '700' },
  meta: typography.caption,
  row: { gap: 2, paddingTop: spacing.xs },
  label: { ...typography.caption, textTransform: 'uppercase' },
  value: typography.body,
})
