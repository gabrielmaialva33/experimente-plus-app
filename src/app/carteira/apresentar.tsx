import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { useAnnouncement } from '@/components/announce'
import { Button } from '@/components/button'
import { ContentSkeleton } from '@/components/content-skeleton'
import { decorative } from '@/components/decorative'
import { RemoteImage } from '@/components/remote-image'
import { useContentFrame } from '@/components/content-frame'
import { HelpLink, TROUBLESHOOTING_HELP } from '@/help/help-link'
import type { HelpTopic } from '@/help/manual'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { ApiError } from '@/api/client'
import { useColors } from '@/theme/use-colors'
import { clock, secondsLeft, spokenClock } from '@/wallet/countdown'
import {
  FinancialRestrictionError,
  useCreatePresentation,
  useWallet,
  type ShownPresentation,
} from '@/wallet/queries'
import {
  FINANCIAL_RESTRICTION_MESSAGE,
  presentationEligibility,
} from '@/wallet/financial-restriction'

/**
 * Seconds left until `deadline`. The clock starts when the code is drawn (the
 * component showing it is mounted per presentation), so a new code never
 * inherits the time the previous one or the loading took, and it stops at zero.
 */
function useSecondsLeft(deadline: number): number {
  const [now, setNow] = useState(() => Date.now())
  const left = secondsLeft(deadline, now)
  const running = left > 0

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [deadline, running])

  return left
}

const EXPIRED = 'Este código expirou. Gere um novo para apresentar.'

const WALLET_HELP = { topic: 'wallet', label: 'Como apresentar o benefício' } as const

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
  const frame = useContentFrame()
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
  // The code at its drawn size, unless the ticket is narrower: clipped, it would not scan.
  const qr = qrSize(frame.width)

  if (eligibility?.blocked || presentation.error instanceof FinancialRestrictionError) {
    return (
      <Stopped icon="pause-circle-outline" help={WALLET_HELP}>
        {FINANCIAL_RESTRICTION_MESSAGE}
      </Stopped>
    )
  }

  const refused =
    presentation.error instanceof ApiError &&
    [400, 403, 409, 422].includes(presentation.error.status)
  if (refused || (eligibility && !eligibility.allowed)) {
    return (
      <Stopped icon="alert-circle-outline" help={WALLET_HELP}>
        Não é possível apresentar este benefício agora. Volte à carteira para atualizar seus
        benefícios.
      </Stopped>
    )
  }

  // The fresh read failed: nothing says the benefit changed, only that it could not be checked.
  if (wallet.isError) {
    return (
      <Stopped
        icon="cloud-offline-outline"
        action={
          <Button
            label="Tentar de novo"
            variant="outline"
            icon="refresh"
            onPress={() => {
              void wallet.refetch()
              if (!data) create()
            }}
          />
        }
        help={TROUBLESHOOTING_HELP}
      >
        Não foi possível conferir o benefício agora. Tente de novo antes de apresentar.
      </Stopped>
    )
  }

  // Until the wallet is read once on this screen, a cached answer is not trusted. The
  // polls after that keep the code on screen: hiding it every 15 seconds would take it
  // away from the partner's camera mid-scan, and a hold still removes it (above).
  if (presentation.isPending || wallet.isPending || !wallet.isFetchedAfterMount) {
    return <ContentSkeleton label="Gerando apresentação" variant="presentation" />
  }

  if (presentation.isError) {
    return (
      <Stopped
        icon="cloud-offline-outline"
        action={<Button label="Tentar de novo" variant="outline" icon="refresh" onPress={create} />}
        help={TROUBLESHOOTING_HELP}
      >
        Não foi possível gerar o código agora.
      </Stopped>
    )
  }

  if (!data) return null

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.page, frame.padding]}
    >
      {/* The benefit as a ticket: the navy stub names it, the code is the part torn off. */}
      <View
        style={[styles.ticket, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
      >
        <View style={[styles.stub, { backgroundColor: colors.chrome }]}>
          <Text style={[styles.overline, { color: colors.chromeMuted }]}>Benefício</Text>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.chromeForeground }]}
          >
            {data.benefit.offer_title}
          </Text>
          <Text style={[styles.place, { color: colors.chromeMuted }]}>
            {data.benefit.establishment_name}
          </Text>
        </View>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.perforation}
        >
          <View
            style={[
              styles.notch,
              styles.notchStart,
              { backgroundColor: colors.background, borderColor: colors.borderSubtle },
            ]}
          />
          <View style={[styles.dashes, { borderColor: colors.borderSubtle }]} />
          <View
            style={[
              styles.notch,
              styles.notchEnd,
              { backgroundColor: colors.background, borderColor: colors.borderSubtle },
            ]}
          />
        </View>

        {/* One per code: a new presentation starts its own clock from its own deadline. */}
        <PresentationCode
          key={`${data.issued_at}:${data.deadline}`}
          presentation={data}
          qr={qr}
          onRenew={create}
        />
      </View>

      <View style={styles.hint}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={colors.mutedForeground}
          {...decorative}
        />
        <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
          Mostre este código ao parceiro. A confirmação é feita por ele.
        </Text>
      </View>
      {/* Under the instruction it expands, never between the person and the code. */}
      <HelpLink {...WALLET_HELP} />

      {data.benefit.terms ? (
        <Text style={[styles.terms, { color: colors.mutedForeground }]}>{data.benefit.terms}</Text>
      ) : null}
    </ScrollView>
  )
}

/**
 * The code, its countdown and the way to a new one. The countdown only reads the
 * deadline and never extends it; its end replaces the code and is announced.
 */
function PresentationCode({
  presentation,
  qr,
  onRenew,
}: {
  presentation: ShownPresentation
  qr: ReturnType<typeof qrSize>
  onRenew: () => void
}) {
  const colors = useColors()
  const remaining = useSecondsLeft(presentation.deadline)
  const expired = remaining === 0
  // The countdown is silent; its end is not.
  useAnnouncement(expired && EXPIRED)

  return (
    <View style={styles.code}>
      {expired ? (
        <View style={[styles.qrSlot, { backgroundColor: colors.muted }, qr.slot]}>
          <Ionicons name="time-outline" size={32} color={colors.mutedForeground} {...decorative} />
          <Text style={[styles.message, { color: colors.mutedForeground }]}>{EXPIRED}</Text>
        </View>
      ) : (
        <RemoteImage
          cachePolicy="none"
          accessible
          accessibilityLabel="Código temporário do benefício"
          source={{ uri: presentation.qr_data_url }}
          style={qr.code}
          contentFit="contain"
          fallback={
            <View style={[styles.qrSlot, { backgroundColor: colors.muted }, qr.slot]}>
              <Text style={[styles.message, { color: colors.mutedForeground }]}>
                Não foi possível mostrar o código. Gere outro código abaixo.
              </Text>
            </View>
          }
        />
      )}

      {/* Server time: the countdown only reads the deadline and never extends it. */}
      <View
        style={[
          styles.timer,
          { backgroundColor: expired ? colors.warningSoft : colors.primarySoft },
        ]}
      >
        <Ionicons
          name={expired ? 'alert-circle-outline' : 'time-outline'}
          size={18}
          color={expired ? colors.warningAccent : colors.primaryAccent}
          {...decorative}
        />
        <Text
          accessibilityLabel={expired ? 'Código expirado' : `Válido por ${spokenClock(remaining)}`}
          style={[
            styles.countdown,
            { color: expired ? colors.warningAccent : colors.primaryAccent },
          ]}
        >
          {expired ? 'Expirado' : `Válido por ${clock(remaining)}`}
        </Text>
      </View>

      {/* A fresh code is the way forward once this one died; before that it is a spare action. */}
      <Button
        label={expired ? 'Gerar novo código' : 'Gerar outro código'}
        variant={expired ? 'cta' : 'outline'}
        size={expired ? 52 : 44}
        icon="refresh"
        align="center"
        onPress={onRenew}
      />
    </View>
  )
}

/**
 * A presentation that cannot happen now: one sentence, a way back when there is
 * one, and the manual's section on it. It replaces the code the person was
 * waiting for, so the sentence is said.
 */
function Stopped({
  icon,
  children,
  action,
  help,
}: {
  icon: keyof typeof Ionicons.glyphMap
  children: string
  action?: ReactNode
  /** The manual's answer to why, under the way forward. */
  help: { topic: HelpTopic; label: string }
}) {
  const colors = useColors()
  const frame = useContentFrame(undefined, spacing.xxl)
  useAnnouncement(children)
  return (
    <View style={[styles.center, frame.padding, { backgroundColor: colors.background }]}>
      <View style={[styles.stoppedIcon, { backgroundColor: colors.muted }]} {...decorative}>
        <Ionicons name={icon} size={28} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.message, { color: colors.foreground }]}>{children}</Text>
      {action}
      <HelpLink topic={help.topic} label={help.label} align="center" />
    </View>
  )
}

const NOTCH = 24
/** The code's drawn size: sharp to a partner's camera, with room around it on a phone. */
const QR_SIZE = 248

/**
 * The code's size in a column `columnWidth` wide: the drawn size, or the
 * ticket's inner width on a phone narrower than that (320 dp leaves 238). A
 * tablet keeps the drawn size, which a camera reads from arm's length.
 */
function qrSize(columnWidth: number) {
  const size = Math.min(QR_SIZE, columnWidth - 2 * spacing.gutter - 2)
  return { code: { height: size, width: size }, slot: { minHeight: size, width: size } }
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
  ticket: { borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },
  stub: {
    gap: spacing.xs,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.gutter,
  },
  overline: typography.overline,
  title: { ...typography.display, fontSize: 26, lineHeight: 30 },
  place: typography.body,
  perforation: { alignItems: 'center', flexDirection: 'row', height: NOTCH },
  notch: { borderRadius: NOTCH / 2, borderWidth: 1, height: NOTCH, width: NOTCH },
  notchStart: { marginLeft: -NOTCH / 2 },
  notchEnd: { marginRight: -NOTCH / 2 },
  dashes: { borderStyle: 'dashed', borderTopWidth: 1.5, flex: 1, marginHorizontal: spacing.sm },
  code: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.gutter,
  },
  // The QR's footprint as a floor: the sentence that stands in for it may need more at large text.
  qrSlot: {
    alignItems: 'center',
    borderRadius: radius.thumb,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.lg,
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
  stoppedIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  hint: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  hintText: { ...typography.meta, flex: 1 },
  terms: { ...typography.caption, paddingHorizontal: spacing.xs },
})
