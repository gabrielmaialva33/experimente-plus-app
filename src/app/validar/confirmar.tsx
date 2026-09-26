import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect, useRef, type ReactNode } from 'react'
import { focusManager, onlineManager } from '@tanstack/react-query'
import { usePrivateOperation } from '@/wallet/use-private-operation'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/button'
import { ContentSkeleton } from '@/components/content-skeleton'
import { ApiError } from '@/api/client'
import { confirmRedemption, previewRedemption } from '@/api/redemptions'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import type { Receipt } from '@/wallet/types'

const NEW_PRESENTATION_MESSAGE = 'Este código não vale mais. Peça ao cliente para gerar um novo.'
// A 400 covers both expired/invalid tokens and domain refusals. Do not claim
// that a new code can bypass a benefit restriction or expose the raw error.
const UNAVAILABLE_PRESENTATION_MESSAGE = 'Não foi possível validar esta apresentação. Peça ao cliente para consultar a carteira e gerar um novo código, se o benefício estiver disponível.'

/**
 * Preview and confirmation.
 *
 * The preview is a read: it shows who the holder is and what the benefit allows,
 * and it never redeems. Confirmation is a separate, deliberate act. Because the
 * server is idempotent by nonce, retrying a confirmation after a timeout
 * returns the original receipt rather than creating a second use.
 */
export default function ConfirmRedemptionScreen() {
  const colors = useColors()
  const router = useRouter()
  const { token: incomingToken } = useLocalSearchParams<{ token?: string }>()
  const token = useRef<string | undefined>(incomingToken)
  const started = useRef(false)
  const confirmationStarted = useRef(false)
  const clearToken = () => { token.current = undefined }

  const preview = usePrivateOperation(async (_: void, signal) => {
    if (!token.current) throw new ApiError(422, null)
    return previewRedemption(token.current, signal)
  }, { onDispose: clearToken, keepPreviousData: true })
  const confirm = usePrivateOperation(async (_: void, signal) => {
    if (!token.current) throw new ApiError(422, null)
    return confirmRedemption(token.current, signal)
  }, { onDispose: clearToken })

  useEffect(() => {
    // The route is only a handoff. History must not retain the private token.
    if (incomingToken) router.setParams({ token: undefined })
  }, [incomingToken, router])

  const { ready: previewReady, mutate: mutatePreview } = preview

  useEffect(() => {
    if (previewReady && !started.current) {
      started.current = true
      mutatePreview()
    }
  }, [previewReady, mutatePreview])

  useEffect(() => {
    if (!previewReady) return
    const repeat = (available: boolean) => {
      // After confirmation starts, preserve the original nonce and its retry
      // even if the preview would now be expired or already redeemed.
      if (available && !confirmationStarted.current) mutatePreview()
    }
    const removeFocus = focusManager.subscribe(repeat)
    const removeOnline = onlineManager.subscribe(repeat)
    return () => { removeFocus(); removeOnline() }
  }, [previewReady, mutatePreview])

  if (confirm.data) {
    return <ReceiptView receipt={confirm.data} onDone={() => router.back()} />
  }

  if (preview.isPending) {
    return <ContentSkeleton label="Carregando apresentação" variant="detail" />
  }

  if (preview.isError) {
    const status = preview.error instanceof ApiError ? preview.error.status : 0

    return (
      <Stopped onBack={() => router.back()}>
        {status === 404 || status === 422
          ? NEW_PRESENTATION_MESSAGE
          : status === 403
            ? 'Sua conta não pode validar este benefício.'
            : status === 400
              ? UNAVAILABLE_PRESENTATION_MESSAGE
              : status === 409
                ? 'Este benefício está indisponível para novos usos. Peça ao cliente para consultar a carteira.'
                : 'Não foi possível ler este código agora.'}
      </Stopped>
    )
  }

  if (!preview.data) return null

  const { holder, benefit } = preview.data
  const confirmationStatus = confirm.error instanceof ApiError ? confirm.error.status : 0
  const refused = [400, 403, 409, 422].includes(confirmationStatus)

  if (refused) {
    return (
      <Stopped onBack={() => router.back()}>
        {confirmationStatus === 400
          ? UNAVAILABLE_PRESENTATION_MESSAGE
          : confirmationStatus === 422
            ? NEW_PRESENTATION_MESSAGE
            : 'Este benefício não está disponível para novos usos. Peça ao cliente para consultar a carteira.'}
      </Stopped>
    )
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.page}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.foreground }]}>Confirmar utilização</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Confira o cliente e o benefício. Nada é registrado antes de você confirmar.
        </Text>
      </View>

      {/* The benefit as the customer's ticket: the navy stub names it and its place. */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <View style={[styles.stub, { backgroundColor: colors.chrome }]}>
          <Text style={[styles.overline, { color: colors.chromeMuted }]}>Benefício</Text>
          <Text style={[styles.benefit, { color: colors.chromeForeground }]}>{benefit.offer_title}</Text>
          <Text style={[styles.place, { color: colors.chromeMuted }]}>{benefit.establishment_name}</Text>
        </View>
        <View style={styles.fields}>
          <Field label="Cliente" value={holder.full_name} emphasis />
          <Field label="Pacote" value={benefit.edition_name} />
          <Field label="Usos restantes" value={String(benefit.remaining_redemptions)} />
          {benefit.terms ? <Field label="Regras" value={benefit.terms} /> : null}
        </View>
      </View>

      {confirm.isError ? (
        <View style={[styles.notice, { backgroundColor: colors.warningSoft }]}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.warningAccent} />
          <Text style={[styles.noticeText, { color: colors.warningAccent }]}>
            A confirmação não completou. Tentar de novo é seguro: se o uso já foi registrado, o mesmo
            comprovante será devolvido.
          </Text>
        </View>
      ) : null}

      {/* Explicit human intent. Nothing here confirms automatically. */}
      <View style={styles.actions}>
        <Button
          label={confirm.isPending ? 'Confirmando…' : 'Confirmar utilização'}
          variant="cta"
          size={52}
          icon="checkmark-circle-outline"
          fill
          disabled={confirm.isPending}
          onPress={() => {
            confirmationStarted.current = true
            preview.cancel()
            confirm.mutate()
          }}
        />
        <Button label="Cancelar" variant="ghost" size={44} fill onPress={() => router.back()} />
      </View>
    </ScrollView>
  )
}

/** A presentation that cannot be validated: the reason in one sentence and the way back to the reader. */
function Stopped({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  const colors = useColors()
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <View style={[styles.mark, { backgroundColor: colors.warningSoft }]}>
        <Ionicons name="alert-circle-outline" size={28} color={colors.warningAccent} />
      </View>
      <Text style={[styles.message, { color: colors.foreground }]}>{children}</Text>
      <Button label="Voltar ao leitor" variant="outline" icon="scan-outline" onPress={onBack} />
    </View>
  )
}

function ReceiptView({ receipt, onDone }: { receipt: Receipt; onDone: () => void }) {
  const colors = useColors()

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <View style={styles.done}>
        <View style={[styles.mark, { backgroundColor: colors.successSoft }]}>
          <Ionicons name="checkmark-done" size={28} color={colors.successAccent} />
        </View>
        <Text accessibilityRole="header" style={[styles.heading, styles.centered, { color: colors.successAccent }]}>Utilização registrada</Text>
      </View>

      <View style={[styles.card, styles.fields, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <Field label="Comprovante" value={receipt.receipt_code} emphasis />
        <Field label="Cliente" value={receipt.holder.full_name} />
        <Field label="Unidade" value={receipt.establishment.name} />
        <Field label="Benefício" value={receipt.offer.title} />
        <Field label="Uso número" value={String(receipt.redemption_number)} />
      </View>

      <Button label="Ler outro código" icon="scan-outline" size={52} fill onPress={onDone} />
    </ScrollView>
  )
}

function Field({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  const colors = useColors()

  return (
    <View style={styles.field}>
      <Text style={[styles.overline, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[emphasis ? styles.emphasis : styles.value, { color: colors.foreground }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg, padding: spacing.gutter, paddingBottom: spacing.xxl },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  head: { gap: spacing.xs },
  heading: typography.title,
  hint: typography.meta,
  centered: { textAlign: 'center' },
  card: { borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },
  stub: { gap: spacing.xs, padding: spacing.gutter },
  overline: typography.overline,
  benefit: { ...typography.display, fontSize: 24, lineHeight: 28 },
  place: typography.body,
  fields: { gap: spacing.md, padding: spacing.gutter },
  field: { gap: 2 },
  value: { ...typography.body, ...textWeight('600') },
  emphasis: typography.heading,
  notice: { alignItems: 'flex-start', borderRadius: radius.surface, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  noticeText: { ...typography.meta, ...textWeight('600'), flex: 1 },
  actions: { gap: spacing.sm },
  done: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg },
  mark: { alignItems: 'center', borderRadius: radius.pill, height: 64, justifyContent: 'center', width: 64 },
  message: { ...typography.body, textAlign: 'center' },
})
