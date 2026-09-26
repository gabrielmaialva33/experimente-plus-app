import { useEffect, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewProps } from 'react-native'

import { ApiError } from '@/api/client'
import type { PurchaseSnapshot } from '@/api/purchases'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export function PurchasePage({ children, refreshControl }: {
  children: ReactNode; refreshControl?: ScrollViewProps['refreshControl']
}) {
  const colors = useColors()
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page} refreshControl={refreshControl}>{children}</ScrollView>
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
  const retrySeconds = error instanceof ApiError && error.status === 429 ? error.retryAfterSeconds ?? 60 : 0
  const [waiting, setWaiting] = useState(retrySeconds)
  const [prevError, setPrevError] = useState(error)

  if (prevError !== error) {
    setPrevError(error)
    setWaiting(retrySeconds)
  }

  useEffect(() => {
    if (waiting <= 0) return
    const timer = setTimeout(() => setWaiting((left) => Math.max(0, left - 1)), 1000)
    return () => clearTimeout(timer)
  }, [waiting])

  return <PurchaseAction label={waiting ? `Aguarde ${waiting}s` : 'Consultar novamente'} disabled={waiting > 0} onPress={onRetry} />
}

export function price(amountCents: number, currency: string) {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amountCents / 100) }
  catch { return `${amountCents / 100} ${currency}` }
}

/** Every operation of the pilot is in Paraná; the city's own zone wins when it is known. */
const DEFAULT_TIME_ZONE = 'America/Sao_Paulo'

const known = (value: string) => Boolean(value) && Number.isFinite(Date.parse(value))

/** The day a window opens or closes, on the city's clock — never a UTC stamp. */
export function purchaseDay(value: string, timeZone = DEFAULT_TIME_ZONE) {
  if (!known(value)) return 'data não informada'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone }).format(new Date(value))
}

/** Day and hour, for the full conditions. */
export function purchaseDate(value: string, timeZone = DEFAULT_TIME_ZONE) {
  if (!known(value)) return 'data não informada'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone }).format(new Date(value))
}

const usesPerPerson = (count: number) => `${count} ${count === 1 ? 'uso' : 'usos'} por pessoa`

/**
 * What a person needs before paying — until when to buy, until when to use,
 * how many uses — in one line each. The windows to the minute and the legal
 * text stay one tap away, under "Ver condições".
 */
export function EditionTerms({ snapshot, timeZone = DEFAULT_TIME_ZONE }: { snapshot: PurchaseSnapshot; timeZone?: string }) {
  const colors = useColors()
  const [open, setOpen] = useState(false)
  // A voucher is one offer named like the product: repeating its title reads as a second item.
  const single = snapshot.offers.length === 1 && snapshot.offers[0].title === snapshot.name
  const usageStartsLater = known(snapshot.usage_starts_at) && known(snapshot.sales_starts_at) &&
    Date.parse(snapshot.usage_starts_at) > Date.parse(snapshot.sales_starts_at)
  const use = usageStartsLater
    ? `Use de ${purchaseDay(snapshot.usage_starts_at, timeZone)} a ${purchaseDay(snapshot.usage_ends_at, timeZone)}`
    : `Use até ${purchaseDay(snapshot.usage_ends_at, timeZone)}`

  return (
    <View style={styles.terms}>
      {snapshot.description ? <PurchaseText>{snapshot.description}</PurchaseText> : null}
      <PurchaseText>{`Compre até ${purchaseDay(snapshot.sales_ends_at, timeZone)} · ${use}`}</PurchaseText>
      {snapshot.offers.map((offer) => (
        <View key={offer.id} style={styles.offer}>
          {single ? null : <PurchaseText heading>{offer.title}</PurchaseText>}
          <PurchaseText>{`${offer.establishment.public_name} · ${usesPerPerson(offer.max_redemptions_per_access)}`}</PurchaseText>
        </View>
      ))}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} hitSlop={spacing.sm}
        onPress={() => setOpen(!open)} style={styles.toggle}>
        <Text style={[styles.toggleLabel, { color: colors.primary }]}>{open ? 'Ocultar condições' : 'Ver condições'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.terms}>
          <PurchaseText>{`Venda: ${purchaseDate(snapshot.sales_starts_at, timeZone)} a ${purchaseDate(snapshot.sales_ends_at, timeZone)}.`}</PurchaseText>
          <PurchaseText>{`Uso: ${purchaseDate(snapshot.usage_starts_at, timeZone)} a ${purchaseDate(snapshot.usage_ends_at, timeZone)}.`}</PurchaseText>
          {snapshot.offers.map((offer) => offer.terms
            ? <PurchaseText key={offer.id}>{single ? offer.terms : `${offer.title}: ${offer.terms}`}</PurchaseText>
            : null)}
          <PurchaseText>A confirmação do pagamento não antecipa as datas de uso nem a disponibilidade de cada benefício.</PurchaseText>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.lg },
  terms: { gap: spacing.sm },
  offer: { gap: spacing.xs },
  toggle: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  toggleLabel: { ...typography.body, ...textWeight('700') },
  action: { borderRadius: radius.md, padding: spacing.md, minHeight: 48, justifyContent: 'center' },
  actionLabel: { ...typography.body, ...textWeight('700'), textAlign: 'center' },
})
