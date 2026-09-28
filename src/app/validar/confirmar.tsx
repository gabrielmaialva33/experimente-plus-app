import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect, useRef } from 'react'
import { focusManager, onlineManager, useQueryClient } from '@tanstack/react-query'
import { usePrivateOperation } from '@/wallet/use-private-operation'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { useAnnouncement } from '@/components/announce'
import { Button } from '@/components/button'
import { ContentSkeleton } from '@/components/content-skeleton'
import { decorative } from '@/components/decorative'
import { useContentFrame } from '@/components/content-frame'
import { ApiError } from '@/api/client'
import { OFFLINE_MESSAGE, useOnline } from '@/api/online'
import { confirmRedemption, previewRedemption } from '@/api/redemptions'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { AccessBlocked, useAccess } from '@/wallet/access-gate'
import { isPresentationToken } from '@/wallet/presentation-token'
import { partnerKeys } from '@/wallet/queries'
import type { Receipt } from '@/wallet/types'

const NOT_COMPLETED =
  'A confirmação não completou. Tentar de novo é seguro: se o uso já foi registrado, o mesmo comprovante será devolvido.'
const NEW_PRESENTATION_MESSAGE = 'Este código não vale mais. Peça ao cliente para gerar um novo.'
// A 400 covers both expired/invalid tokens and domain refusals. Do not claim
// that a new code can bypass a benefit restriction or expose the raw error.
const UNAVAILABLE_PRESENTATION_MESSAGE =
  'Não foi possível validar esta apresentação. Peça ao cliente para consultar a carteira e gerar um novo código, se o benefício estiver disponível.'

/**
 * What a refused presentation tells the partner, by the status the server kept
 * (`classifyBenefitRedemptionFailure`): the same at the preview and at the
 * confirmation. Null when the status is not a refusal of the presentation — a
 * network failure, a 5xx, a 429 — which a new attempt may resolve.
 */
function refusal(status: number): string | null {
  switch (status) {
    case 404:
    case 422:
      return NEW_PRESENTATION_MESSAGE
    case 403:
      return 'Sua conta não pode validar este benefício.'
    case 400:
      return UNAVAILABLE_PRESENTATION_MESSAGE
    case 409:
      return 'Este benefício está indisponível para novos usos. Peça ao cliente para consultar a carteira.'
    default:
      return null
  }
}

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
  const frame = useContentFrame()
  const router = useRouter()
  const client = useQueryClient()
  const online = useOnline()
  // Validar depends on `partner.redemptions.validate`; a link can open this route
  // on its own, so nothing is asked of the server before the session grants it.
  const access = useAccess('validate')
  const allowed = access === 'allowed'
  const { token: incomingToken } = useLocalSearchParams<{ token?: string }>()
  // Only a token the scanner could have handed over: anything else is refused as a stale code.
  const token = useRef<string | undefined>(
    isPresentationToken(incomingToken) ? incomingToken : undefined
  )
  const started = useRef(false)
  const confirmationStarted = useRef(false)
  const clearToken = () => {
    token.current = undefined
  }

  const preview = usePrivateOperation(
    async (_: void, signal) => {
      if (!token.current) throw new ApiError(422, null)
      return previewRedemption(token.current, signal)
    },
    { onDispose: clearToken, keepPreviousData: true }
  )
  const confirm = usePrivateOperation(
    async (_: void, signal) => {
      if (!token.current) throw new ApiError(422, null)
      const receipt = await confirmRedemption(token.current, signal)
      // The history may be cached from before this use; the receipt itself is never cached.
      if (!signal.aborted) void client.invalidateQueries({ queryKey: partnerKeys.redemptions })
      return receipt
    },
    { onDispose: clearToken }
  )

  useEffect(() => {
    // The route is only a handoff. History must not retain the private token.
    if (incomingToken) router.setParams({ token: undefined })
  }, [incomingToken, router])

  const { ready: previewReady, mutate: mutatePreview } = preview
  // The one outcome of "Confirmar utilização" that leaves the screen as it was.
  useAnnouncement(confirm.isError && !confirm.data && NOT_COMPLETED)

  useEffect(() => {
    if (previewReady && allowed && !started.current) {
      started.current = true
      mutatePreview()
    }
  }, [previewReady, allowed, mutatePreview])

  useEffect(() => {
    if (!previewReady || !allowed) return
    const repeat = (available: boolean) => {
      // After confirmation starts, preserve the original nonce and its retry
      // even if the preview would now be expired or already redeemed.
      if (available && !confirmationStarted.current) mutatePreview()
    }
    const removeFocus = focusManager.subscribe(repeat)
    const removeOnline = onlineManager.subscribe(repeat)
    return () => {
      removeFocus()
      removeOnline()
    }
  }, [previewReady, allowed, mutatePreview])

  if (access === 'loading') {
    return <ContentSkeleton label="Carregando apresentação" variant="detail" />
  }

  if (!allowed) return <AccessBlocked access={access} area="validate" />

  if (confirm.data) {
    return <ReceiptView receipt={confirm.data} onDone={() => router.back()} />
  }

  if (preview.isPending) {
    return <ContentSkeleton label="Carregando apresentação" variant="detail" />
  }

  if (preview.isError) {
    const refused = refusal(preview.error instanceof ApiError ? preview.error.status : 0)
    // A preview is a read: when it did not reach an answer, asking again is safe.
    // Offline it also asks again by itself once the connection returns.
    return (
      <Stopped onBack={() => router.back()} retry={refused ? undefined : () => mutatePreview()}>
        {refused ??
          (online
            ? 'Não foi possível ler este código agora.'
            : `${OFFLINE_MESSAGE} A prévia volta sozinha quando a conexão voltar.`)}
      </Stopped>
    )
  }

  if (!preview.data) return null

  const { holder, benefit } = preview.data
  const refused = refusal(confirm.error instanceof ApiError ? confirm.error.status : 0)

  if (refused) {
    return <Stopped onBack={() => router.back()}>{refused}</Stopped>
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.page, frame.padding]}
    >
      <View style={styles.head}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.foreground }]}>
          Confirmar utilização
        </Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Confira o cliente e o benefício. Nada é registrado antes de você confirmar.
        </Text>
      </View>

      {/* The benefit as the customer's ticket: the navy stub names it and its place. */}
      <View
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
      >
        <View style={[styles.stub, { backgroundColor: colors.chrome }]}>
          <Text style={[styles.overline, { color: colors.chromeMuted }]}>Benefício</Text>
          <Text style={[styles.benefit, { color: colors.chromeForeground }]}>
            {benefit.offer_title}
          </Text>
          <Text style={[styles.place, { color: colors.chromeMuted }]}>
            {benefit.establishment_name}
          </Text>
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
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={colors.warningAccent}
            {...decorative}
          />
          <Text style={[styles.noticeText, { color: colors.warningAccent }]}>{NOT_COMPLETED}</Text>
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

/**
 * A presentation that cannot be validated: the reason in one sentence and the
 * way back to the reader, after a new attempt when one may succeed.
 */
function Stopped({
  children,
  onBack,
  retry,
}: {
  children: string
  onBack: () => void
  retry?: () => void
}) {
  const colors = useColors()
  useAnnouncement(children)
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <View style={[styles.mark, { backgroundColor: colors.warningSoft }]} {...decorative}>
        <Ionicons name="alert-circle-outline" size={28} color={colors.warningAccent} />
      </View>
      <Text style={[styles.message, { color: colors.foreground }]}>{children}</Text>
      {retry ? <Button label="Tentar de novo" icon="refresh" onPress={retry} /> : null}
      <Button label="Voltar ao leitor" variant="outline" icon="scan-outline" onPress={onBack} />
    </View>
  )
}

function ReceiptView({ receipt, onDone }: { receipt: Receipt; onDone: () => void }) {
  const colors = useColors()
  const frame = useContentFrame()
  useAnnouncement(`Utilização registrada. Comprovante ${receipt.receipt_code}.`)

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.page, frame.padding]}
    >
      <View style={styles.done}>
        <View style={[styles.mark, { backgroundColor: colors.successSoft }]} {...decorative}>
          <Ionicons name="checkmark-done" size={28} color={colors.successAccent} />
        </View>
        <Text
          accessibilityRole="header"
          style={[styles.heading, styles.centered, { color: colors.successAccent }]}
        >
          Utilização registrada
        </Text>
      </View>

      <View
        style={[
          styles.card,
          styles.fields,
          { backgroundColor: colors.card, borderColor: colors.borderSubtle },
        ]}
      >
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

function Field({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  const colors = useColors()

  return (
    <View style={styles.field}>
      <Text style={[styles.overline, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[emphasis ? styles.emphasis : styles.value, { color: colors.foreground }]}>
        {value}
      </Text>
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
  notice: {
    alignItems: 'flex-start',
    borderRadius: radius.surface,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  noticeText: { ...typography.meta, ...textWeight('600'), flex: 1 },
  actions: { gap: spacing.sm },
  done: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg },
  mark: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  message: { ...typography.body, textAlign: 'center' },
})
