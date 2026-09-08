import { useEffect, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { ApiError } from '@/api/client'
import type { PurchaseSnapshot } from '@/api/purchases'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export function PurchasePage({ children }: { children: ReactNode }) {
  const colors = useColors()
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>{children}</ScrollView>
}

export function PurchaseText({ children, heading = false }: { children: ReactNode; heading?: boolean }) {
  const colors = useColors()
  return <Text style={[heading ? typography.heading : typography.body, { color: colors.foreground }]}>{children}</Text>
}

export function PurchaseAction({ label, onPress, disabled = false, conversion = false }: {
  label: string; onPress: () => void; disabled?: boolean; conversion?: boolean
}) {
  const colors = useColors()
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[
      styles.action,
      { backgroundColor: conversion ? colors.cta : colors.surfaceRaised, opacity: disabled ? 0.5 : 1 },
    ]}>
      <Text style={[styles.actionLabel, { color: conversion ? colors.ctaForeground : colors.primary }]}>{label}</Text>
    </Pressable>
  )
}

/** Retry-After governs manual retries too; the status itself is never inferred from time. */
export function RetryPurchase({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const [waiting, setWaiting] = useState(0)
  useEffect(() => {
    const seconds = error instanceof ApiError && error.status === 429 ? error.retryAfterSeconds ?? 60 : 0
    setWaiting(seconds)
    if (!seconds) return
    const timer = setInterval(() => setWaiting((left) => Math.max(0, left - 1)), 1000)
    return () => clearInterval(timer)
  }, [error])
  return <PurchaseAction label={waiting ? `Aguarde ${waiting}s` : 'Consultar novamente'} disabled={waiting > 0} onPress={onRetry} />
}

export function price(amountCents: number, currency: string) {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amountCents / 100) }
  catch { return `${amountCents / 100} ${currency}` }
}

function date(value: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value)) + ' UTC'
}

export function EditionTerms({ snapshot }: { snapshot: PurchaseSnapshot }) {
  return (
    <View style={styles.terms}>
      <PurchaseText heading>{snapshot.name}</PurchaseText>
      {snapshot.description ? <PurchaseText>{snapshot.description}</PurchaseText> : null}
      <PurchaseText>Venda: {date(snapshot.sales_starts_at)} até {date(snapshot.sales_ends_at)}</PurchaseText>
      <PurchaseText>Uso: {date(snapshot.usage_starts_at)} até {date(snapshot.usage_ends_at)}</PurchaseText>
      <PurchaseText>A compra é da edição inteira. A confirmação do pagamento não antecipa as datas de uso nem a disponibilidade de cada benefício.</PurchaseText>
      {snapshot.offers.map((offer) => (
        <View key={offer.id} style={styles.terms}>
          <PurchaseText heading>{offer.title}</PurchaseText>
          {offer.terms ? <PurchaseText>{offer.terms}</PurchaseText> : null}
          <PurchaseText>Limite por acesso: {offer.max_redemptions_per_access}</PurchaseText>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.lg },
  terms: { gap: spacing.sm },
  action: { borderRadius: radius.md, padding: spacing.md, minHeight: 48, justifyContent: 'center' },
  actionLabel: { ...typography.body, fontWeight: '700', textAlign: 'center' },
})
