import Ionicons from '@expo/vector-icons/Ionicons'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useAnnouncement } from '@/components/announce'
import { Button } from '@/components/button'
import { decorative } from '@/components/decorative'
import { EmptyState } from '@/components/empty-state'
import { FormTextInput, KeyboardForm } from '@/components/keyboard-form'
import { useContentFrame } from '@/components/content-frame'
import { ApiError } from '@/api/client'
import type { ReportReason, ReportTargetType } from '@/api/reviews'
import { useReportAnonymously, useReportContent } from '@/reviews/queries'
import { useSession } from '@/session/context'
import { displayWeight, radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * The reasons the server accepts, in the server's vocabulary.
 *
 * This list used to offer `fake` and `privacy_violation`, which the validator
 * refuses: two of the six choices could only end in an error. The values are
 * typed from the generated contract, so a reason the server does not know no
 * longer compiles.
 */
const LABELS: Record<ReportReason, string> = {
  offensive: 'Ofensivo ou discriminatório',
  harassment: 'Assédio',
  inappropriate: 'Conteúdo inadequado',
  false_information: 'Informação falsa',
  spam: 'Spam ou propaganda',
  conflict_of_interest: 'Conflito de interesse',
  other: 'Outro motivo',
}

/**
 * The reasons that fit each target (audit A46). A place is not harassed and
 * does not have a conflict of interest; a review can have both. Every value is
 * one the server accepts.
 */
const CONTENT_REASONS: ReportReason[] = [
  'false_information',
  'inappropriate',
  'offensive',
  'spam',
  'other',
]
const REASONS: Record<ReportableTarget, ReportReason[]> = {
  review: [
    'offensive',
    'harassment',
    'inappropriate',
    'false_information',
    'spam',
    'conflict_of_interest',
    'other',
  ],
  reply: ['offensive', 'harassment', 'inappropriate', 'false_information', 'spam', 'other'],
  establishment: CONTENT_REASONS,
  experience: CONTENT_REASONS,
  event: CONTENT_REASONS,
  showcase_item: CONTENT_REASONS,
}

/** A place's false information is usually stale information; say so. */
const reasonLabel = (target: ReportableTarget, reason: ReportReason) =>
  target === 'establishment' && reason === 'false_information'
    ? 'Informação falsa ou desatualizada'
    : LABELS[reason]

/**
 * What can be reported from the app, and what the screen calls it.
 *
 * An explicit list, with no fallback. The route used to treat anything it did
 * not recognise as a review, so an unknown type with a real number would have
 * reported the review that happened to share that number — the collision
 * between species that the Concierge had to design its citations around.
 */
type ReportableTarget = Extract<
  ReportTargetType,
  'review' | 'reply' | 'establishment' | 'experience' | 'event' | 'showcase_item'
>

const TITLES: Record<ReportableTarget, string> = {
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

export const reportableTarget = (value: string | undefined): ReportableTarget | null =>
  value && Object.prototype.hasOwnProperty.call(TITLES, value) ? (value as ReportableTarget) : null

/**
 * Reporting a review, a reply, a place or partner content.
 *
 * The answer carries a protocol number, and it is the one thing this screen
 * insists on showing: a report that vanishes without a receipt gives the person
 * nothing to follow up with (ADR-0027).
 */
export default function ReportContentScreen() {
  const colors = useColors()
  const frame = useContentFrame()
  const router = useRouter()
  // `nome` names what is reported, so the form can say it (audit A45).
  const { type, id, nome } = useLocalSearchParams<{ type: string; id: string; nome?: string }>()
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
  useAnnouncement(
    report.isSuccess
      ? `Denúncia registrada. Protocolo ${report.data.protocol_number}.`
      : report.isError && failureMessage(report.error, anonymous)
  )

  if (report.isSuccess) {
    return (
      <View style={[styles.page, styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Denúncia registrada' }} />
        <View style={[styles.done, { backgroundColor: colors.successSoft }]} {...decorative}>
          <Ionicons name="checkmark" size={32} color={colors.successAccent} />
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
          Denúncia registrada
        </Text>
        <Text style={[styles.body, styles.centered, { color: colors.foreground }]}>
          Guarde o protocolo para acompanhar o caso:
        </Text>
        <Text
          selectable
          style={[styles.protocol, { color: colors.primaryAccent }]}
          testID="report-protocol"
        >
          {report.data.protocol_number}
        </Text>
        <Text style={[styles.note, styles.centered, { color: colors.mutedForeground }]}>
          A moderação analisa e responde dentro do prazo definido por esta operação.
        </Text>
      </View>
    )
  }

  if (!target || !Number.isInteger(targetId) || targetId <= 0) {
    return (
      <View style={[styles.page, styles.unsupported, { backgroundColor: colors.background }]}>
        <EmptyState
          testID="report-unsupported"
          icon="flag-outline"
          title="Não é possível denunciar este conteúdo por aqui"
          action={{ label: 'Voltar', onPress: () => router.back() }}
        />
      </View>
    )
  }

  const busy = !reason || report.isPending || resolving

  return (
    <KeyboardForm
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.page, frame.padding]}
    >
      {/* The header says what the form does; the page names what it acts on. */}
      <Stack.Screen options={{ title: TITLES[target] }} />
      {nome ? (
        <View style={styles.subject} testID="report-subject">
          <Text style={[styles.overline, { color: colors.mutedForeground }]}>
            Você está denunciando
          </Text>
          <Text style={[styles.subjectName, { color: colors.foreground }]}>{nome}</Text>
        </View>
      ) : null}

      <View accessibilityRole="radiogroup" accessibilityLabel="Motivo" style={styles.reasons}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.foreground }]}>
          Qual é o problema?
        </Text>
        {REASONS[target].map((value) => {
          const selected = reason === value
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              // The reason is what is being sent: it holds still until the answer.
              accessibilityState={{ selected, checked: selected, disabled: report.isPending }}
              disabled={report.isPending}
              onPress={() => setReason(value)}
              style={[
                styles.reason,
                {
                  backgroundColor: selected ? colors.choiceSelected : colors.card,
                  borderColor: selected ? colors.primary : colors.borderSubtle,
                },
              ]}
              testID={`reason-${value}`}
            >
              <View
                style={[
                  styles.radio,
                  { borderColor: selected ? colors.primary : colors.choiceBorder },
                ]}
                testID={`reason-${value}-radio`}
              >
                {selected ? (
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                ) : null}
              </View>
              <Text style={[styles.reasonLabel, { color: colors.foreground }]}>
                {reasonLabel(target, value)}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          Quer explicar melhor? (opcional)
        </Text>
        <FormTextInput
          accessibilityLabel="Quer explicar melhor? (opcional)"
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
        testID={anonymous ? 'report-anonymous-note' : 'report-identified-note'}
      >
        {anonymous
          ? 'Esta denúncia é anônima: não fica ligada a você nem a uma conta. Guardamos apenas um código que impede repetir a mesma denúncia.'
          : 'Esta denúncia vai com a sua conta. A moderação sabe quem denunciou; o lugar, não.'}
      </Text>

      {report.isError ? (
        <Text style={[styles.body, { color: colors.destructiveAccent }]}>
          {failureMessage(report.error, anonymous)}
        </Text>
      ) : null}

      <Button
        label={report.isPending ? 'Enviando…' : 'Enviar denúncia'}
        size={52}
        fill
        disabled={busy}
        testID="report-submit"
        onPress={() =>
          reason &&
          report.mutate({
            target_type: target,
            target_id: targetId,
            reason,
            ...(details.trim() ? { details: details.trim() } : {}),
          })
        }
      />
    </KeyboardForm>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.xl, padding: spacing.gutter, paddingBottom: spacing.xxl },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center' },
  unsupported: { flex: 1, justifyContent: 'center' },
  centered: { textAlign: 'center' },
  done: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  title: typography.title,
  subject: { gap: spacing.xs },
  overline: typography.overline,
  subjectName: { ...typography.heading, ...displayWeight('800') },
  heading: { ...typography.label, ...textWeight('700') },
  reasons: { gap: spacing.sm },
  reason: {
    alignItems: 'center',
    borderRadius: radius.thumb,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  radio: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  dot: { borderRadius: radius.pill, height: 10, width: 10 },
  reasonLabel: { ...typography.body, flexShrink: 1 },
  field: { gap: spacing.sm },
  label: { ...typography.label, ...textWeight('700') },
  input: {
    borderWidth: 1,
    borderRadius: radius.thumb,
    minHeight: 112,
    padding: spacing.md,
    textAlignVertical: 'top',
    ...typography.body,
  },
  body: typography.body,
  note: typography.meta,
  protocol: { ...typography.title, letterSpacing: 1 },
})
