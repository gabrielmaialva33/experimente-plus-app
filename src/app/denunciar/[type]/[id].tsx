import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { FormTextInput, KeyboardForm } from '@/components/keyboard-form'
import { ApiError } from '@/api/client'
import type { ReportReason, ReportTargetType } from '@/api/reviews'
import { useReportAnonymously, useReportContent } from '@/reviews/queries'
import { useSession } from '@/session/context'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * The reasons the server accepts, in the server's vocabulary.
 *
 * This list used to offer `fake` and `privacy_violation`, which the validator
 * refuses: two of the six choices could only end in an error. The values are
 * typed from the generated contract, so a reason the server does not know no
 * longer compiles.
 */
const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'offensive', label: 'Ofensivo ou discriminatório' },
  { value: 'harassment', label: 'Assédio' },
  { value: 'inappropriate', label: 'Conteúdo inadequado' },
  { value: 'false_information', label: 'Informação falsa' },
  { value: 'spam', label: 'Spam ou propaganda' },
  { value: 'conflict_of_interest', label: 'Conflito de interesse' },
  { value: 'other', label: 'Outro motivo' },
]

/**
 * What can be reported from the app, and what the screen calls it.
 *
 * An explicit list, with no fallback. The route used to treat anything it did
 * not recognise as a review, so an unknown type with a real number would have
 * reported the review that happened to share that number — the collision
 * between species that the Concierge had to design its citations around.
 */
const TITLES: Partial<Record<ReportTargetType, string>> = {
  review: 'Denunciar avaliação',
  reply: 'Denunciar resposta',
  establishment: 'Denunciar este lugar',
  experience: 'Denunciar experiência',
  event: 'Denunciar evento',
  showcase_item: 'Denunciar item de vitrine',
}

/** What a failed report tells the person, by what the server answered. */
export function failureMessage(error: unknown, anonymous: boolean): string {
  const status = error instanceof ApiError ? error.status : null
  if (status === 409) {
    return anonymous
      ? 'Este conteúdo já foi denunciado a partir desta conexão ou deste aparelho.'
      : 'Você já denunciou este conteúdo.'
  }
  if (status === 429) return 'Muitas denúncias a partir desta conexão. Tente de novo mais tarde.'
  if (status === 404) return 'Este conteúdo não está mais disponível para denúncia.'
  return 'Não foi possível enviar a denúncia agora.'
}

export const reportableTarget = (value: string | undefined): ReportTargetType | null =>
  value && value in TITLES ? (value as ReportTargetType) : null

/**
 * Reporting a review, a reply, a place or partner content.
 *
 * The answer carries a protocol number, and it is the one thing this screen
 * insists on showing: a report that vanishes without a receipt gives the person
 * nothing to follow up with (ADR-0027).
 */
export default function ReportContentScreen() {
  const colors = useColors()
  const { type, id } = useLocalSearchParams<{ type: string; id: string }>()
  const target = reportableTarget(type)
  const targetId = Number(id)

  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const { status } = useSession()
  // Without an account the report is anonymous; with one, it carries the
  // account. Nothing is decided while the session is still being read, so a
  // signed-in person never files anonymously by accident.
  const resolving = status === 'loading'
  const anonymous = !resolving && status !== 'authenticated'
  const identified = useReportContent()
  const withoutAccount = useReportAnonymously()
  const report = anonymous ? withoutAccount : identified

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

  if (!target || !Number.isInteger(targetId) || targetId <= 0) {
    return (
      <View style={[styles.page, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.body, { color: colors.mutedForeground }]} testID="report-unsupported">
          Não é possível denunciar este conteúdo por aqui.
        </Text>
      </View>
    )
  }

  return (
    <KeyboardForm style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <Text style={[styles.title, { color: colors.foreground }]}>{TITLES[target]}</Text>

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
        <FormTextInput
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

      <Text
        style={[styles.note, { color: colors.mutedForeground }]}
        testID={anonymous ? 'report-anonymous-note' : 'report-identified-note'}>
        {anonymous
          ? 'Esta denúncia é anônima: não fica ligada a você nem a uma conta. Guardamos apenas um código que impede repetir a mesma denúncia.'
          : 'Esta denúncia vai com a sua conta. A moderação sabe quem denunciou; o estabelecimento, não.'}
      </Text>

      {report.isError ? (
        <Text style={[styles.body, { color: colors.destructiveAccent }]}>
          {failureMessage(report.error, anonymous)}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !reason || report.isPending || resolving }}
        disabled={!reason || report.isPending || resolving}
        onPress={() =>
          reason &&
          report.mutate({
            target_type: target,
            target_id: targetId,
            reason,
            ...(details.trim() ? { details: details.trim() } : {}),
          })
        }
        style={[
          styles.action,
          { backgroundColor: colors.cta, opacity: !reason || report.isPending || resolving ? 0.5 : 1 },
        ]}
        testID="report-submit">
        <Text style={[styles.actionLabel, { color: colors.ctaForeground }]}>
          {report.isPending ? 'Enviando…' : 'Enviar denúncia'}
        </Text>
      </Pressable>
    </KeyboardForm>
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
