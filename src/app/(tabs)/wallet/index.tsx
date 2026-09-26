import Ionicons from '@expo/vector-icons/Ionicons'
import { useFocusEffect, useRouter } from 'expo-router'
import { setStatusBarStyle } from 'expo-status-bar'
import { useCallback } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import type { Purchase } from '@/api/purchases'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { ContentSkeleton } from '@/components/content-skeleton'
import { LinkCard } from '@/components/link-card'
import { usePullToRefresh } from '@/components/pull-to-refresh'
import { ScreenHeader } from '@/components/screen-header'
import { TicketCard } from '@/components/ticket-card'
import { price, purchaseDay } from '@/purchases/components'
import { orderState } from '@/purchases/order-state'
import { usePurchases } from '@/purchases/queries'
import { useSession } from '@/session/context'
import { radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { useWallet } from '@/wallet/queries'
import { AVAILABILITY_LABEL, type WalletBenefit, type WalletPass } from '@/wallet/types'
import { canPresentBenefit, FINANCIAL_RESTRICTION_MESSAGE, financiallyBlocked } from '@/wallet/financial-restriction'

const uses = (count: number) => `${count} ${count === 1 ? 'uso restante' : 'usos restantes'}`

export default function WalletScreen() {
  const colors = useColors()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { status } = useSession()
  const wallet = useWallet()
  const orders = usePurchases()
  const refreshControl = usePullToRefresh(wallet.refetch, orders.refetch)

  // The band runs under the status bar, so its icons turn light while the tab shows.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light')
      return () => setStatusBarStyle('auto')
    }, [])
  )

  if (status !== 'authenticated') {
    return (
      <Centered>
        <Text style={[styles.message, { color: colors.foreground }]}>
          Entre para ver seus benefícios.
        </Text>
      </Centered>
    )
  }

  if (wallet.isPending) {
    return <ContentSkeleton label="Carregando carteira" variant="list" />
  }

  const passes = wallet.data?.passes ?? []
  const cities = [...new Set(passes.map((pass) => pass.edition.city.name))]
  const pending = (orders.data?.purchases ?? []).filter((order) => orderState(order) === 'pending')
  const available = wallet.data?.summary.available ?? 0
  const redeemed = wallet.data?.summary.redeemed ?? 0
  const empty = !wallet.isError && passes.length === 0
  const openCatalog = () => router.push('/wallet/edicoes')

  return (
    <SafeAreaView edges={['left', 'right']} style={{ backgroundColor: colors.background, flex: 1 }}>
      {/* The band scrolls with the page; the status bar keeps its colour. */}
      <View style={{ backgroundColor: colors.chrome, height: insets.top }} />
      <ScrollView contentContainerStyle={styles.page} refreshControl={refreshControl}>
        <ScreenHeader
          insetTop={false}
          title="Carteira"
          subtitle={cities.length === 1 ? `Seus benefícios em ${cities[0]}` : 'Seus benefícios, pedidos e usos'}
        />

        <View style={styles.content}>
          {pending.length > 0 ? (
            <PendingOrders
              orders={pending}
              onOpen={() => router.push(pending.length === 1 ? `/wallet/pedido/${pending[0].id}` : '/wallet/edicoes')}
            />
          ) : null}

          {wallet.isError ? (
            <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.panelTitle, { color: colors.foreground }]}>Não foi possível atualizar a carteira</Text>
              <Text style={[styles.panelBody, { color: colors.mutedForeground }]}>
                Tente novamente antes de apresentar um benefício.
              </Text>
              <Button label="Atualizar carteira" variant="outline" size={44} icon="refresh" onPress={() => void wallet.refetch()} />
            </View>
          ) : null}

          {empty ? (
            // An empty wallet still leads somewhere: to what can be bought (A19, A34).
            <View testID="wallet-empty" style={[styles.panel, styles.emptyPanel, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.ctaSoft }]}>
                <Ionicons name="ticket-outline" size={28} color={colors.ctaAccent} />
              </View>
              <Text accessibilityRole="header" style={[styles.panelTitle, styles.centered, { color: colors.foreground }]}>
                Sua carteira está vazia
              </Text>
              <Text style={[styles.panelBody, styles.centered, { color: colors.mutedForeground }]}>
                Escolha um pacote da cidade ou o voucher de um lugar. Os benefícios aparecem aqui assim que o pagamento é confirmado.
              </Text>
              <Button label="Ver benefícios disponíveis" variant="cta" size={48} onPress={openCatalog} />
            </View>
          ) : null}

          {!wallet.isError && passes.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.foreground }]}>Seus benefícios</Text>
                <Text style={[styles.count, { color: colors.mutedForeground }]}>
                  {available} {available === 1 ? 'disponível' : 'disponíveis'}
                </Text>
              </View>
              {passes.map((pass) => (
                <PassGroup
                  key={pass.access.id}
                  pass={pass}
                  onPresent={(benefit) =>
                    router.push(`/carteira/apresentar?accessId=${benefit.access_id}&offerId=${benefit.offer_id}`)
                  }
                />
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.foreground }]}>Histórico</Text>
            {/* Past uses stay reachable without holding a current benefit. */}
            <LinkCard
              icon="receipt-outline"
              title={redeemed === 0 ? 'Nenhum uso ainda' : `${redeemed} ${redeemed === 1 ? 'uso registrado' : 'usos registrados'}`}
              subtitle={redeemed === 0
                ? 'Quando você usar um benefício, o comprovante fica guardado aqui.'
                : 'Abra Meus usos para ver cada comprovante.'}
              accessibilityLabel="Meus usos"
              onPress={() => router.push('/carteira/historico')}
            />
          </View>

          {empty ? null : (
            <LinkCard
              tone="primary"
              title="Ver benefícios disponíveis"
              subtitle="Pacotes da cidade, vouchers de cada lugar e seus pedidos"
              onPress={openCatalog}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

/** Orders waiting for payment: they grant nothing yet, but they are not lost (A19). */
function PendingOrders({ orders, onOpen }: { orders: Purchase[]; onOpen: () => void }) {
  const [first] = orders
  return (
    <LinkCard
      testID="wallet-pending-orders"
      tone="warning"
      icon="time-outline"
      title={orders.length === 1 ? '1 pedido aguardando pagamento' : `${orders.length} pedidos aguardando pagamento`}
      subtitle={orders.length === 1
        ? `${first.snapshot.name} · ${price(first.snapshot.amount_cents, first.snapshot.currency)}`
        : 'Acompanhe cada um em Meus pedidos'}
      onPress={onOpen}
    />
  )
}

function PassGroup({ pass, onPresent }: { pass: WalletPass; onPresent: (benefit: WalletBenefit) => void }) {
  const colors = useColors()
  const voucher = pass.access.product_type === 'offer'
  const blocked = financiallyBlocked(pass.access)

  return (
    <View testID={`wallet-pass-${pass.access.id}`} style={styles.pass}>
      <View style={styles.passHeading}>
        <Text style={[styles.overline, { color: colors.ctaAccent }]}>
          {voucher ? 'Voucher avulso' : 'Pacote da cidade'}
        </Text>
        {/* A voucher is named by its place, which the ticket already shows. */}
        {voucher ? null : <Text style={[styles.passName, { color: colors.foreground }]}>{pass.edition.name}</Text>}
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {pass.edition.city.name} · {pass.edition.city.state_code}
        </Text>
      </View>
      {blocked ? (
        <Text style={[styles.note, { color: colors.statusNeutralForeground, backgroundColor: colors.statusNeutral }]}>
          {FINANCIAL_RESTRICTION_MESSAGE}
        </Text>
      ) : null}
      {pass.benefits.map((benefit) => (
        <BenefitTicket key={benefit.key} benefit={benefit} pass={pass} onPresent={() => onPresent(benefit)} />
      ))}
    </View>
  )
}

function BenefitTicket({ benefit, pass, onPresent }: { benefit: WalletBenefit; pass: WalletPass; onPresent: () => void }) {
  const colors = useColors()
  const usable = canPresentBenefit(pass, benefit)
  const blocked = financiallyBlocked(pass.access)
  // A financial hold is explained once, above its tickets; each ticket names any other reason.
  const reason = usable || blocked
    ? null
    : AVAILABILITY_LABEL[pass.access.status === 'revoked' ? 'revoked'
      : pass.access.availability !== 'available' ? pass.access.availability : benefit.availability]
  const place = benefit.establishment.public_name
  const day = (value: string) => purchaseDay(value, pass.edition.city.timezone)

  return (
    <TicketCard
      testID={`wallet-benefit-${benefit.key}`}
      stubLabel={benefit.title}
      title={place}
      meta={pass.access.availability === 'upcoming'
        ? `Válido de ${day(pass.access.usage_starts_at)} a ${day(pass.access.usage_ends_at)}`
        : `Válido até ${day(pass.access.usage_ends_at)}`}>
      {benefit.description ? (
        <Text numberOfLines={2} style={[styles.meta, { color: colors.mutedForeground }]}>{benefit.description}</Text>
      ) : null}
      {benefit.remaining_redemptions != null || reason ? (
        <View style={styles.badges}>
          {benefit.remaining_redemptions != null ? <Badge tone="benefit" label={uses(benefit.remaining_redemptions)} /> : null}
          {reason ? <Badge tone="neutral" label={reason} /> : null}
        </View>
      ) : null}
      <Button
        label="Apresentar"
        variant="cta"
        size={44}
        icon="qr-code-outline"
        disabled={!usable}
        accessibilityLabel={`Apresentar ${benefit.title} em ${place}`}
        onPress={onPresent}
      />
    </TicketCard>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  const colors = useColors()
  return <View style={[styles.center, { backgroundColor: colors.background }]}>{children}</View>
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.section },
  content: { gap: spacing.section, paddingHorizontal: spacing.gutter, paddingTop: spacing.gutter },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.xxl },
  message: { ...typography.body, textAlign: 'center' },
  section: { gap: 14 },
  sectionHeading: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  sectionTitle: typography.title,
  count: typography.meta,
  pass: { gap: spacing.md },
  passHeading: { gap: 2 },
  overline: typography.overline,
  passName: typography.heading,
  meta: typography.meta,
  note: { ...typography.meta, ...textWeight('600'), borderRadius: radius.surface, padding: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  panel: { borderRadius: radius.card, borderWidth: 1, gap: spacing.sm, padding: 18 },
  emptyPanel: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { alignItems: 'center', borderRadius: radius.pill, height: 56, justifyContent: 'center', marginBottom: spacing.xs, width: 56 },
  panelTitle: { ...typography.label, ...textWeight('700') },
  panelBody: { ...typography.meta, marginBottom: spacing.sm },
  centered: { textAlign: 'center' },
})
