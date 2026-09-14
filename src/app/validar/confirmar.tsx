import { useEffect, useRef } from 'react'
import { focusManager, onlineManager } from '@tanstack/react-query'
import { usePrivateOperation } from '@/wallet/use-private-operation'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { ApiError } from '@/api/client'
import { confirmRedemption, previewRedemption } from '@/api/redemptions'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import type { Receipt } from '@/wallet/types'

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

  useEffect(() => {
    if (preview.ready && !started.current) {
      started.current = true
      preview.mutate()
    }
  }, [preview.ready, preview.mutate])

  useEffect(() => {
    if (!preview.ready) return
    const repeat = (available: boolean) => {
      // After confirmation starts, preserve the original nonce and its retry
      // even if the preview would now be expired or already redeemed.
      if (available && !confirmationStarted.current) preview.mutate()
    }
    const removeFocus = focusManager.subscribe(repeat)
    const removeOnline = onlineManager.subscribe(repeat)
    return () => { removeFocus(); removeOnline() }
  }, [preview.ready, preview.mutate])

  if (confirm.data) {
    return <ReceiptView receipt={confirm.data} onDone={() => router.back()} />
  }

  if (preview.isPending) {
    return <ActivityIndicator style={styles.center} color={colors.primary} />
  }

  if (preview.isError) {
    const status = preview.error instanceof ApiError ? preview.error.status : 0

    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.foreground }]}>
          {status === 404 || status === 422
            ? 'Este código não vale mais. Peça ao cliente para gerar um novo.'
            : status === 403
              ? 'Sua conta não pode validar este benefício.'
              : status === 400 || status === 409
                ? 'Este benefício está indisponível para novos usos. Peça ao cliente para consultar a carteira.'
              : 'Não foi possível ler este código agora.'}
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.link, { color: colors.primary }]}>Voltar ao leitor</Text>
        </Pressable>
      </View>
    )
  }

  if (!preview.data) return null

  const { holder, benefit } = preview.data
  const refused = confirm.error instanceof ApiError && [400, 403, 409, 422].includes(confirm.error.status)

  if (refused) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.foreground }]}>
          Este benefício não está disponível para novos usos. Peça ao cliente para consultar a carteira.
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.link, { color: colors.primary }]}>Voltar ao leitor</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.page}>
      <Text style={[styles.heading, { color: colors.foreground }]}>Confirmar utilização</Text>

      <Field label="Cliente" value={holder.full_name} />
      <Field label="Unidade" value={benefit.establishment_name} />
      <Field label="Benefício" value={benefit.offer_title} />
      <Field label="Edição" value={benefit.edition_name} />
      <Field label="Usos restantes" value={String(benefit.remaining_redemptions)} />
      {benefit.terms ? <Field label="Regras" value={benefit.terms} /> : null}

      {confirm.isError ? (
        <Text style={[styles.message, { color: colors.warningAccent }]}>
          A confirmação não completou. Tentar de novo é seguro: se o uso já foi registrado, o mesmo
          comprovante será devolvido.
        </Text>
      ) : null}

      {/* Explicit human intent. Nothing here confirms automatically. */}
      <Pressable
        accessibilityRole="button"
        disabled={confirm.isPending}
        onPress={() => {
          confirmationStarted.current = true
          preview.cancel()
          confirm.mutate()
        }}
        style={[styles.action, { backgroundColor: colors.cta, opacity: confirm.isPending ? 0.6 : 1 }]}>
        <Text style={[styles.actionLabel, { color: colors.ctaForeground }]}>
          {confirm.isPending ? 'Confirmando…' : 'Confirmar utilização'}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()}>
        <Text style={[styles.link, { color: colors.mutedForeground }]}>Cancelar</Text>
      </Pressable>
    </ScrollView>
  )
}

function ReceiptView({ receipt, onDone }: { receipt: Receipt; onDone: () => void }) {
  const colors = useColors()

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <Text style={[styles.heading, { color: colors.successAccent }]}>Utilização registrada</Text>

      <Field label="Comprovante" value={receipt.receipt_code} />
      <Field label="Cliente" value={receipt.holder.full_name} />
      <Field label="Unidade" value={receipt.establishment.name} />
      <Field label="Benefício" value={receipt.offer.title} />
      <Field label="Uso número" value={String(receipt.redemption_number)} />

      <Pressable
        accessibilityRole="button"
        onPress={onDone}
        style={[styles.action, { backgroundColor: colors.primary }]}>
        <Text style={[styles.actionLabel, { color: colors.primaryForeground }]}>Ler outro código</Text>
      </Pressable>
    </ScrollView>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  const colors = useColors()

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.md, padding: spacing.xl },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  heading: { ...typography.title, marginBottom: spacing.sm },
  field: { gap: 2 },
  label: { ...typography.caption, textTransform: 'uppercase' },
  value: { ...typography.body, fontWeight: '600' },
  message: { ...typography.body, textAlign: 'center' },
  link: { ...typography.body, fontWeight: '700', textAlign: 'center' },
  action: {
    alignItems: 'center',
    borderRadius: radius.pill,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionLabel: { ...typography.body, fontWeight: '700' },
})
