import Ionicons from '@expo/vector-icons/Ionicons'
import { StyleSheet, Text, View } from 'react-native'

import { radius, spacing, typography, textWeight } from '@/theme/tokens'
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
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      <View style={styles.head}>
        <View style={[styles.mark, { backgroundColor: colors.successSoft }]}>
          <Ionicons name="checkmark-done" size={20} color={colors.successAccent} />
        </View>
        <View style={styles.headText}>
          <Text style={[styles.title, { color: colors.foreground }]}>{receipt.offer.title}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {receipt.establishment.name}
          </Text>
        </View>
        {compact ? <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /> : null}
      </View>

      <View style={styles.stamp}>
        <Text style={[styles.overline, { color: colors.mutedForeground }]}>Comprovante</Text>
        <Text selectable={!compact} style={[styles.code, { color: colors.foreground }]}>{receipt.receipt_code}</Text>
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

      {compact ? null : (
        <View style={[styles.rows, { borderTopColor: colors.borderSubtle }]}>
          <Row label="Pacote" value={receipt.edition.name} />
          <Row label="Titular" value={receipt.holder.full_name} />
          <Row label="Uso número" value={String(receipt.redemption_number)} />
          {receipt.offer.terms ? <Row label="Regras" value={receipt.offer.terms} /> : null}
        </View>
      )}
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  const colors = useColors()

  return (
    <View style={styles.row}>
      <Text style={[styles.overline, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  head: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  mark: { alignItems: 'center', borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  headText: { flex: 1, gap: 2 },
  title: { ...typography.body, ...textWeight('700') },
  meta: typography.meta,
  stamp: { alignItems: 'baseline', columnGap: spacing.sm, flexDirection: 'row', flexWrap: 'wrap' },
  overline: typography.overline,
  code: { ...typography.label, ...textWeight('700'), fontVariant: ['tabular-nums'], letterSpacing: 1 },
  rows: { borderTopWidth: 1, gap: spacing.md, paddingTop: spacing.md },
  row: { gap: 2 },
  value: typography.body,
})
