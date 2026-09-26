import Ionicons from '@expo/vector-icons/Ionicons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState, type ReactNode } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { paymentInstructions, type Purchase } from '@/api/purchases'
import { Badge, type BadgeTone } from '@/components/badge'
import { Button } from '@/components/button'
import { SectionHeader } from '@/components/section-header'
import { radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { cancelPurchase } from '@/purchases/cancel'
import { EditionTerms, PurchasePage, PurchaseText, RetryPurchase, price, purchaseDate } from '@/purchases/components'
import { checkoutUrl, ORDER_COPY, orderState, type OrderState } from '@/purchases/order-state'
import { usePurchase } from '@/purchases/queries'
import { walletKeys } from '@/wallet/queries'

const ORDER_TONE: Record<OrderState, BadgeTone> = {
  pending: 'warning', confirmed: 'success', late_confirmation: 'info', failed: 'neutral', blocked: 'neutral', refunded: 'neutral',
}

export default function PurchaseOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const query = usePurchase(id)
  const client = useQueryClient()
  const order = query.data
  const state = order ? orderState(order) : null
  const [openingError, setOpeningError] = useState(false)
  const colors = useColors()

  const hasOrder = Boolean(order)
  const orderStatus = order?.status
  const accessId = order?.access_id
  const financiallyBlocked = order?.financially_blocked

  useEffect(() => {
    if (!hasOrder) return
    void client.invalidateQueries({ queryKey: walletKeys.wallet })
    // The orders list shows the same status and may still be mounted underneath.
    void client.invalidateQueries({ queryKey: ['purchases'] })
  }, [client, hasOrder, orderStatus, accessId, financiallyBlocked])

  if (query.isPending) return <PurchasePage><PurchaseText>Consultando pedido…</PurchaseText></PurchasePage>
  if (query.isError || !order || !state) return <PurchasePage>
    <PurchaseText>Não foi possível confirmar o estado do pedido. Não inicie outro pagamento por causa desta falha de conexão.</PurchaseText>
    <RetryPurchase error={query.error} onRetry={() => void query.refetch()} />
  </PurchasePage>

  const copy = ORDER_COPY[state]
  const url = checkoutUrl(order)
  const instructions = paymentInstructions(order)
  const pending = state === 'pending'

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <View style={[styles.card, styles.summary, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <Badge label={copy.title} tone={ORDER_TONE[state]} />
        <Text accessibilityRole="header" style={[styles.name, { color: colors.foreground }]}>{order.snapshot.name}</Text>
        <Text style={[styles.price, { color: colors.foreground }]}>{price(order.amount_cents, order.currency)}</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>{copy.message}</Text>
      </View>

      {/* A4: a pending order says what happens next, in order, instead of waiting mute. */}
      {pending ? <NextSteps order={order} hasCode={Boolean(instructions.code)} hasLink={Boolean(url)} /> : null}

      {pending && instructions.code ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Código de pagamento. Este código não apresenta um benefício.</Text>
          <View style={[styles.code, { backgroundColor: colors.muted }]}>
            <Text selectable style={[styles.codeText, { color: colors.foreground }]}>{instructions.code}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        {url ? <Button label="Continuar pagamento" variant="cta" size={52} icon="open-outline" onPress={() => {
          setOpeningError(false)
          // Opening/returning from checkout is not a payment event. Only GET updates state.
          void Linking.openURL(url).catch(() => setOpeningError(true))
        }} /> : null}
        {openingError ? <PurchaseText>Não foi possível abrir o pagamento. Consulte o pedido antes de tentar novamente.</PurchaseText> : null}
        {state === 'confirmed' ? <Button label="Consultar carteira" icon="wallet-outline" onPress={() => router.navigate('/wallet')} /> : null}
        <RetryPurchase error={null} onRetry={() => void query.refetch()} />
      </View>

      {pending && order.status === 'pending' ? <CancelOrder id={order.id} onCancelled={() => void query.refetch()} /> : null}

      <View style={styles.section}>
        <SectionHeader title="Condições" />
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <EditionTerms snapshot={order.snapshot} />
        </View>
      </View>
    </ScrollView>
  )
}

function NextSteps({ order, hasCode, hasLink }: { order: Purchase; hasCode: boolean; hasLink: boolean }) {
  const how = hasCode && hasLink ? 'Copie o código abaixo no app do seu banco ou continue pelo link de pagamento.'
    : hasCode ? 'Copie o código abaixo no app do seu banco.'
      : hasLink ? 'Continue pelo link de pagamento.'
        : 'As instruções de pagamento aparecem aqui assim que estiverem prontas.'
  const deadline = order.expires_at ? ` Prazo: ${purchaseDate(order.expires_at)}.` : ''

  return (
    <View testID="order-next-steps" style={styles.section}>
      <SectionHeader title="O que acontece agora" />
      <Step number={1} title="Pague o pedido">{`${how}${deadline}`}</Step>
      <Step number={2} title="Aguarde a confirmação">Esta tela confere o pedido sozinha. Você também pode consultar agora.</Step>
      <Step number={3} title="Use na Carteira">Os benefícios aparecem na Carteira assim que o pagamento é confirmado.</Step>
    </View>
  )
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  const colors = useColors()
  return (
    <View style={styles.step}>
      <View style={[styles.stepNumber, { backgroundColor: colors.primarySoft }]}>
        <Text style={[styles.stepDigit, { color: colors.primaryAccent }]}>{number}</Text>
      </View>
      <View style={styles.stepText}>
        <Text style={[styles.label, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>{children}</Text>
      </View>
    </View>
  )
}

/**
 * Cancelling an unpaid order through the existing endpoint, after an explicit
 * second step: a payment already made is confirmed by the server, never undone here.
 */
function CancelOrder({ id, onCancelled }: { id: string; onCancelled: () => void }) {
  const colors = useColors()
  const client = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const cancel = useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: () => cancelPurchase(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['purchases'] })
      onCancelled()
    },
  })

  if (cancel.isSuccess) {
    return (
      <View style={[styles.notice, { backgroundColor: colors.infoSoft }]}>
        <Ionicons name="checkmark-circle-outline" size={20} color={colors.infoAccent} />
        <Text style={[styles.noticeText, { color: colors.infoAccent }]}>
          Cancelamento solicitado. O estado do pedido é atualizado em instantes.
        </Text>
      </View>
    )
  }

  if (!confirming) {
    return <Button label="Cancelar pedido" variant="ghost" size={44} icon="close-circle-outline" onPress={() => setConfirming(true)} />
  }

  return (
    <View style={[styles.card, styles.confirm, { backgroundColor: colors.warningSoft, borderColor: colors.warningSoft }]}>
      <Text style={[styles.label, { color: colors.foreground }]}>Cancelar este pedido?</Text>
      <Text style={[styles.meta, { color: colors.warningAccent }]}>
        Cancele só se ainda não pagou. Um pagamento já feito é confirmado aqui; nesse caso, aguarde.
      </Text>
      {cancel.isError ? (
        <Text style={[styles.meta, { color: colors.foreground }]}>
          Não foi possível cancelar agora. Consulte o pedido antes de tentar de novo.
        </Text>
      ) : null}
      <View style={styles.confirmActions}>
        <Button label="Manter pedido" variant="ghost" size={44} disabled={cancel.isPending} onPress={() => setConfirming(false)} />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: cancel.isPending }}
          disabled={cancel.isPending}
          onPress={() => cancel.mutate()}
          style={({ pressed }) => [styles.destructive, { backgroundColor: colors.destructive, opacity: cancel.isPending ? 0.6 : pressed ? 0.85 : 1 }]}>
          <Text style={[styles.destructiveLabel, { color: colors.destructiveForeground }]}>
            {cancel.isPending ? 'Cancelando…' : 'Sim, cancelar pedido'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.xl, padding: spacing.gutter, paddingBottom: spacing.xxl },
  card: { borderRadius: radius.card, borderWidth: 1, padding: spacing.lg },
  summary: { gap: spacing.sm },
  name: typography.heading,
  price: { ...typography.display, fontSize: 28, lineHeight: 32 },
  body: typography.body,
  section: { gap: spacing.md },
  label: { ...typography.label, ...textWeight('700') },
  meta: typography.meta,
  code: { borderRadius: radius.surface, padding: spacing.md },
  codeText: { ...typography.meta, fontVariant: ['tabular-nums'] },
  actions: { gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md },
  stepNumber: { alignItems: 'center', borderRadius: radius.pill, height: 28, justifyContent: 'center', width: 28 },
  stepDigit: { ...typography.label, ...textWeight('700') },
  stepText: { flex: 1, gap: 2 },
  notice: { alignItems: 'flex-start', borderRadius: radius.surface, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  noticeText: { ...typography.meta, flex: 1 },
  confirm: { gap: spacing.sm },
  confirmActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' },
  destructive: { alignItems: 'center', borderRadius: radius.pill, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.gutter },
  destructiveLabel: { ...typography.label, ...textWeight('700') },
})
