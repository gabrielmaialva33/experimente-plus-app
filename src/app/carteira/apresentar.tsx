import { Image } from 'expo-image'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { radius, spacing, typography } from '@/theme/tokens'
import { ApiError } from '@/api/client'
import { useColors } from '@/theme/use-colors'
import { FinancialRestrictionError, useCreatePresentation, useWallet } from '@/wallet/queries'
import { FINANCIAL_RESTRICTION_MESSAGE, presentationEligibility } from '@/wallet/financial-restriction'

/** Seconds remaining until `expiresAt`, floored at zero. */
function useCountdown(expiresAt: string | undefined): number {
  const target = useMemo(() => (expiresAt ? new Date(expiresAt).getTime() : 0), [expiresAt])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!target) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [target])

  return target ? Math.max(0, Math.floor((target - now) / 1000)) : 0
}

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/**
 * Temporary presentation.
 *
 * The deadline belongs to the server: the countdown reads `expires_at` and is
 * never extended locally, and an expired code is replaced rather than reused
 * (ADR-0021). The QR itself arrives rendered as a data URL, so the token is
 * never encoded — or logged — on the device.
 *
 * Unlike the market reference, there is no screenshot protection here: a code
 * that dies in five minutes and is revalidated on the server at preview and at
 * confirmation does not depend on the secrecy of the image.
 */
export default function PresentScreen() {
  const colors = useColors()
  const { accessId, offerId } = useLocalSearchParams<{ accessId: string; offerId: string }>()
  const presentation = useCreatePresentation()
  const wallet = useWallet(15_000)
  const eligibility = wallet.data
    ? presentationEligibility(wallet.data, Number(accessId), Number(offerId))
    : null

  const create = () =>
    presentation.mutate({ accessId: Number(accessId), offerId: Number(offerId) })

  useEffect(() => {
    if (accessId && offerId) create()
    // A presentation is created once per screen entry, on purpose.
  }, [accessId, offerId])

  const data = presentation.data
  const remaining = useCountdown(data?.expires_at)
  const expired = Boolean(data) && remaining === 0

  if (eligibility?.blocked || presentation.error instanceof FinancialRestrictionError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.foreground }]}>{FINANCIAL_RESTRICTION_MESSAGE}</Text>
      </View>
    )
  }

  const refused = presentation.error instanceof ApiError && [400, 403, 409, 422].includes(presentation.error.status)
  if (wallet.isError || refused || (eligibility && !eligibility.allowed)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.foreground }]}>
          Não é possível apresentar este benefício agora. Volte à carteira para atualizar o acesso.
        </Text>
      </View>
    )
  }

  if (presentation.isPending || wallet.isPending || wallet.isFetching) {
    return <ActivityIndicator style={styles.center} color={colors.primary} />
  }

  if (presentation.isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.foreground }]}>
          Não foi possível gerar o código agora.
        </Text>
        <Pressable onPress={create}>
          <Text style={[styles.link, { color: colors.primary }]}>Tentar de novo</Text>
        </Pressable>
      </View>
    )
  }

  if (!data) return null

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{data.benefit.offer_title}</Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {data.benefit.establishment_name}
      </Text>

      {expired ? (
        <View style={[styles.qrSlot, { borderColor: colors.border }]}>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>
            Este código expirou. Gere um novo para apresentar.
          </Text>
        </View>
      ) : (
        <Image accessibilityLabel="Código temporário do benefício" source={{ uri: data.qr_data_url }} style={styles.qr} contentFit="contain" />
      )}

      <Text style={[styles.countdown, { color: expired ? colors.warningAccent : colors.foreground }]}>
        {expired ? 'Expirado' : `Válido por ${clock(remaining)}`}
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={create}
        style={[styles.action, { backgroundColor: colors.cta }]}>
        <Text style={[styles.actionLabel, { color: colors.ctaForeground }]}>
          {expired ? 'Gerar novo código' : 'Gerar outro código'}
        </Text>
      </Pressable>

      {data.benefit.terms ? (
        <Text style={[styles.terms, { color: colors.mutedForeground }]}>{data.benefit.terms}</Text>
      ) : null}

      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        Mostre este código ao parceiro. A confirmação é feita por ele.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', flex: 1, gap: spacing.md, padding: spacing.xl },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.xxl },
  title: { ...typography.heading, textAlign: 'center' },
  meta: { ...typography.caption, textAlign: 'center' },
  qr: { height: 240, marginVertical: spacing.lg, width: 240 },
  qrSlot: {
    alignItems: 'center',
    borderRadius: radius.surface,
    borderWidth: 1,
    height: 240,
    justifyContent: 'center',
    marginVertical: spacing.lg,
    padding: spacing.lg,
    width: 240,
  },
  countdown: { ...typography.heading, fontVariant: ['tabular-nums'] },
  message: { ...typography.body, textAlign: 'center' },
  link: { ...typography.body, fontWeight: '700' },
  action: {
    alignItems: 'center',
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  actionLabel: { ...typography.body, fontWeight: '700' },
  terms: { ...typography.caption, textAlign: 'center' },
})
