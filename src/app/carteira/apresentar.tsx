import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/button'
import { ContentSkeleton } from '@/components/content-skeleton'
import { RemoteImage } from '@/components/remote-image'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
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
  const { mutate: mutatePresentation } = presentation
  const wallet = useWallet(15_000)
  const eligibility = wallet.data
    ? presentationEligibility(wallet.data, Number(accessId), Number(offerId))
    : null

  const create = useCallback(
    () => mutatePresentation({ accessId: Number(accessId), offerId: Number(offerId) }),
    [mutatePresentation, accessId, offerId]
  )

  const startedFor = useRef<string | null>(null)
  useEffect(() => {
    const key = `${accessId}:${offerId}`
    if (presentation.ready && accessId && offerId && startedFor.current !== key) {
      startedFor.current = key
      create()
    }
    // A presentation is created once per screen entry, on purpose.
  }, [accessId, offerId, presentation.ready, create])

  const data = presentation.data
  const remaining = useCountdown(data?.expires_at)
  const expired = Boolean(data) && remaining === 0

  if (eligibility?.blocked || presentation.error instanceof FinancialRestrictionError) {
    return <Stopped icon="pause-circle-outline">{FINANCIAL_RESTRICTION_MESSAGE}</Stopped>
  }

  const refused = presentation.error instanceof ApiError && [400, 403, 409, 422].includes(presentation.error.status)
  if (wallet.isError || refused || (eligibility && !eligibility.allowed)) {
    return (
      <Stopped icon="alert-circle-outline">
        Não é possível apresentar este benefício agora. Volte à carteira para atualizar seus benefícios.
      </Stopped>
    )
  }

  if (presentation.isPending || wallet.isPending || wallet.isFetching) {
    return <ContentSkeleton label="Gerando apresentação" variant="presentation" />
  }

  if (presentation.isError) {
    return (
      <Stopped icon="cloud-offline-outline" action={<Button label="Tentar de novo" variant="outline" icon="refresh" onPress={create} />}>
        Não foi possível gerar o código agora.
      </Stopped>
    )
  }

  if (!data) return null

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      {/* The benefit as a ticket: the navy stub names it, the code is the part torn off. */}
      <View style={[styles.ticket, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        <View style={[styles.stub, { backgroundColor: colors.chrome }]}>
          <Text style={[styles.overline, { color: colors.chromeMuted }]}>Benefício</Text>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.chromeForeground }]}>{data.benefit.offer_title}</Text>
          <Text style={[styles.place, { color: colors.chromeMuted }]}>{data.benefit.establishment_name}</Text>
        </View>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.perforation}>
          <View style={[styles.notch, styles.notchStart, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]} />
          <View style={[styles.dashes, { borderColor: colors.borderSubtle }]} />
          <View style={[styles.notch, styles.notchEnd, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]} />
        </View>

        <View style={styles.code}>
          {expired ? (
            <View style={[styles.qrSlot, { backgroundColor: colors.muted }]}>
              <Ionicons name="time-outline" size={32} color={colors.mutedForeground} />
              <Text style={[styles.message, { color: colors.mutedForeground }]}>
                Este código expirou. Gere um novo para apresentar.
              </Text>
            </View>
          ) : (
            <RemoteImage
              cachePolicy="none"
              accessibilityLabel="Código temporário do benefício"
              source={{ uri: data.qr_data_url }}
              style={styles.qr}
              contentFit="contain"
              fallback={
                <View style={[styles.qrSlot, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.message, { color: colors.mutedForeground }]}>
                    Não foi possível mostrar o código. Gere outro código abaixo.
                  </Text>
                </View>
              }
            />
          )}

          {/* Server time: the countdown only reads expires_at and never extends it. */}
          <View style={[styles.timer, { backgroundColor: expired ? colors.warningSoft : colors.primarySoft }]}>
            <Ionicons name={expired ? 'alert-circle-outline' : 'time-outline'} size={18}
              color={expired ? colors.warningAccent : colors.primaryAccent} />
            <Text style={[styles.countdown, { color: expired ? colors.warningAccent : colors.primaryAccent }]}>
              {expired ? 'Expirado' : `Válido por ${clock(remaining)}`}
            </Text>
          </View>

          {/* A fresh code is the way forward once this one died; before that it is a spare action. */}
          <Button
            label={expired ? 'Gerar novo código' : 'Gerar outro código'}
            variant={expired ? 'cta' : 'outline'}
            size={expired ? 52 : 44}
            icon="refresh"
            onPress={create}
          />
        </View>
      </View>

      <View style={styles.hint}>
        <Ionicons name="information-circle-outline" size={20} color={colors.mutedForeground} />
        <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
          Mostre este código ao parceiro. A confirmação é feita por ele.
        </Text>
      </View>

      {data.benefit.terms ? (
        <Text style={[styles.terms, { color: colors.mutedForeground }]}>{data.benefit.terms}</Text>
      ) : null}
    </ScrollView>
  )
}

/** A presentation that cannot happen now: one sentence, and a way back when there is one. */
function Stopped({ icon, children, action }: {
  icon: keyof typeof Ionicons.glyphMap; children: ReactNode; action?: ReactNode
}) {
  const colors = useColors()
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <View style={[styles.stoppedIcon, { backgroundColor: colors.muted }]}>
        <Ionicons name={icon} size={28} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.message, { color: colors.foreground }]}>{children}</Text>
      {action}
    </View>
  )
}

const NOTCH = 24

const styles = StyleSheet.create({
  page: { gap: spacing.lg, padding: spacing.gutter, paddingBottom: spacing.xxl },
  center: { alignItems: 'center', flex: 1, gap: spacing.lg, justifyContent: 'center', padding: spacing.xxl },
  ticket: { borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },
  stub: { gap: spacing.xs, paddingBottom: spacing.xl, paddingHorizontal: spacing.gutter, paddingTop: spacing.gutter },
  overline: typography.overline,
  title: { ...typography.display, fontSize: 26, lineHeight: 30 },
  place: typography.body,
  perforation: { alignItems: 'center', flexDirection: 'row', height: NOTCH },
  notch: { borderRadius: NOTCH / 2, borderWidth: 1, height: NOTCH, width: NOTCH },
  notchStart: { marginLeft: -NOTCH / 2 },
  notchEnd: { marginRight: -NOTCH / 2 },
  dashes: { borderStyle: 'dashed', borderTopWidth: 1.5, flex: 1, marginHorizontal: spacing.sm },
  code: { alignItems: 'center', gap: spacing.lg, paddingBottom: spacing.xl, paddingHorizontal: spacing.gutter },
  qr: { height: 248, width: 248 },
  qrSlot: {
    alignItems: 'center',
    borderRadius: radius.thumb,
    gap: spacing.sm,
    height: 248,
    justifyContent: 'center',
    padding: spacing.lg,
    width: 248,
  },
  timer: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 36,
    paddingHorizontal: spacing.lg,
  },
  countdown: { ...typography.label, ...textWeight('700'), fontVariant: ['tabular-nums'] },
  message: { ...typography.body, textAlign: 'center' },
  stoppedIcon: { alignItems: 'center', borderRadius: radius.pill, height: 56, justifyContent: 'center', width: 56 },
  hint: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.xs },
  hintText: { ...typography.meta, flex: 1 },
  terms: { ...typography.caption, paddingHorizontal: spacing.xs },
})
