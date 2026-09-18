import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { ApiError } from '@/api/client'
import type { ReportReason } from '@/api/reviews'
import { useReportContent } from '@/reviews/queries'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'inappropriate', label: 'Conteúdo inadequado' },
  { value: 'spam', label: 'Spam ou propaganda' },
  { value: 'fake', label: 'Avaliação falsa' },
  { value: 'offensive', label: 'Ofensivo ou discriminatório' },
  { value: 'privacy_violation', label: 'Expõe dados de alguém' },
  { value: 'other', label: 'Outro motivo' },
]

/**
 * Reporting a review or a reply.
 *
 * The answer carries a protocol number, and it is the one thing this screen
 * insists on showing: a report that vanishes without a receipt gives the person
 * nothing to follow up with (ADR-0027).
 */
export default function ReportContentScreen() {
  const colors = useColors()
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>()
  const target = type === 'review_reply' ? 'review_reply' : 'review'

  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const report = useReportContent()

  if (report.isSuccess) {
    return (
      <View style={[styles.page, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Denúncia registrada</Text>
        <Text style={[styles.body, { color: colors.foreground }]}>
          Guarde o protocolo para acompanhar o caso:
        </Text>
        <Text
          selectable
          style={[styles.protocol, { color: colors.primaryAccent }]}
          testID="report-protocol">
          {report.data.protocol_number}
        </Text>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          A moderação analisa e responde dentro do prazo definido por esta operação.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {target === 'review_reply' ? 'Denunciar resposta' : 'Denunciar avaliação'}
      </Text>

      <View style={styles.reasons}>
        {REASONS.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: reason === option.value }}
            onPress={() => setReason(option.value)}
            style={[
              styles.reason,
              {
                backgroundColor:
                  reason === option.value ? colors.choiceSelected : colors.choiceBackground,
                borderColor: reason === option.value ? colors.primary : colors.border,
              },
            ]}
            testID={`reason-${option.value}`}>
            <Text style={[styles.body, { color: colors.foreground }]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          Quer explicar melhor? (opcional)
        </Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={4000}
          editable={!report.isPending}
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.input, color: colors.foreground },
          ]}
        />
      </View>

      {report.isError ? (
        <Text style={[styles.body, { color: colors.destructiveAccent }]}>
          {report.error instanceof ApiError && report.error.status === 409
            ? 'Você já denunciou este conteúdo.'
            : 'Não foi possível enviar a denúncia agora.'}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !reason || report.isPending }}
        disabled={!reason || report.isPending}
        onPress={() =>
          reason &&
          report.mutate({
            target_type: target,
            target_id: Number(id),
            reason,
            ...(details.trim() ? { details: details.trim() } : {}),
          })
        }
        style={[
          styles.action,
          { backgroundColor: colors.cta, opacity: !reason || report.isPending ? 0.5 : 1 },
        ]}
        testID="report-submit">
        <Text style={[styles.actionLabel, { color: colors.ctaForeground }]}>
          {report.isPending ? 'Enviando…' : 'Enviar denúncia'}
        </Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  title: typography.title,
  reasons: { gap: spacing.sm },
  reason: { borderWidth: 1, borderRadius: radius.md, justifyContent: 'center', minHeight: 48, padding: spacing.md },
  field: { gap: spacing.xs },
  label: typography.caption,
  input: { borderWidth: 1, borderRadius: radius.md, minHeight: 100, padding: spacing.md, textAlignVertical: 'top', ...typography.body },
  body: typography.body,
  note: { ...typography.caption, textAlign: 'center' },
  protocol: { ...typography.title, letterSpacing: 1 },
  action: { alignItems: 'center', borderRadius: radius.surface, justifyContent: 'center', minHeight: 48, padding: spacing.md },
  actionLabel: { ...typography.body, fontWeight: '700' },
})
