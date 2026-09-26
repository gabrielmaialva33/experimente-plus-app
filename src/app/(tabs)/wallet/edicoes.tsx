import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import type { Purchase, PurchaseProduct } from '@/api/purchases'
import { Badge, type BadgeTone } from '@/components/badge'
import { usePullToRefresh } from '@/components/pull-to-refresh'
import { SectionHeader } from '@/components/section-header'
import { RetryPurchase, price, usageWindow } from '@/purchases/components'
import { productKey, productLabel, productRoute } from '@/purchases/products'
import { ORDER_COPY, orderState, type OrderState } from '@/purchases/order-state'
import { usePurchaseEditions, usePurchases } from '@/purchases/queries'
import { radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const ORDER_TONE: Record<OrderState, BadgeTone> = {
  pending: 'warning', confirmed: 'success', late_confirmation: 'info', failed: 'neutral', blocked: 'neutral', refunded: 'neutral',
}

export default function PurchaseEditionsScreen() {
  const colors = useColors()
  const router = useRouter()
  const editions = usePurchaseEditions()
  const orders = usePurchases()
  const refreshControl = usePullToRefresh(editions.refetch, orders.refetch)

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page} refreshControl={refreshControl}>
      <View style={styles.section}>
        <SectionHeader title="Pacotes e vouchers" hint="Explorar lugares é livre. Comprar um pacote ou voucher é opcional." />
        {editions.isPending ? <Note>Carregando produtos…</Note> : null}
        {editions.isError ? <>
          <Note>Os produtos não estão disponíveis agora. Você pode continuar explorando.</Note>
          <RetryPurchase error={editions.error} onRetry={() => void editions.refetch()} />
        </> : null}
        {editions.data?.products.length === 0 ? <Note>Nenhum produto disponível no momento.</Note> : null}
        {editions.data?.products.map((product) => (
          <ProductCard key={productKey(product)} product={product} onPress={() => router.push(productRoute(product, 'wallet'))} />
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Meus pedidos" />
        {orders.isPending ? <Note>Carregando pedidos…</Note> : null}
        {orders.isError ? <>
          <Note>Não foi possível consultar os pedidos. Consulte antes de iniciar uma nova compra.</Note>
          <RetryPurchase error={orders.error} onRetry={() => void orders.refetch()} />
        </> : null}
        {orders.data?.purchases.length === 0 ? <Note>Você ainda não tem pedidos.</Note> : null}
        {orders.data?.purchases.map((order) => (
          <OrderRow key={order.id} order={order} onPress={() => router.push(`/wallet/pedido/${encodeURIComponent(order.id)}`)} />
        ))}
      </View>
    </ScrollView>
  )
}

/**
 * One product as a card (A20): its kind, its name, what it includes, until when
 * it is used and its price — the city is said once, in the kind line.
 */
function ProductCard({ product, onPress }: { product: PurchaseProduct; onPress: () => void }) {
  const colors = useColors()
  const offers = product.snapshot.offers
  const amount = price(product.amount_cents, product.currency)
  const window = usageWindow(product.snapshot, product.city?.timezone ?? undefined)
  const includes = product.product_type === 'offer'
    ? offers.map((offer) => offer.title).join(' · ')
    : `${offers.length} ${offers.length === 1 ? 'benefício' : 'benefícios'}: ${offers.map((offer) => offer.establishment.public_name).join(', ')}`

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${productLabel(product)} · ${product.name} · ${amount}`}
      accessibilityHint={`Inclui ${includes}. Use até ${window.useUntil}.`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle, opacity: pressed ? 0.85 : 1 }]}>
      <Text style={[styles.overline, { color: colors.ctaAccent }]}>{productLabel(product)}</Text>
      <Text style={[styles.name, { color: colors.foreground }]}>{product.name}</Text>
      {offers.length ? (
        <View style={styles.line}>
          <Ionicons name="ticket-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>{includes}</Text>
        </View>
      ) : null}
      <View style={styles.line}>
        <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>Use até {window.useUntil}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={[styles.price, { color: colors.foreground }]}>{amount}</Text>
        <View style={styles.go}>
          <Text style={[styles.goLabel, { color: colors.primary }]}>Ver detalhes</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  )
}

function OrderRow({ order, onPress }: { order: Purchase; onPress: () => void }) {
  const colors = useColors()
  const state = orderState(order)
  const title = ORDER_COPY[state].title

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${order.snapshot.name} · ${title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.order, { backgroundColor: colors.card, borderColor: colors.borderSubtle, opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.orderText}>
        <Text style={[styles.orderName, { color: colors.foreground }]}>{order.snapshot.name}</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>{price(order.amount_cents, order.currency)}</Text>
        <Badge label={title} tone={ORDER_TONE[state]} />
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </Pressable>
  )
}

function Note({ children }: { children: string }) {
  const colors = useColors()
  return <Text style={[typography.body, { color: colors.mutedForeground }]}>{children}</Text>
}

const styles = StyleSheet.create({
  page: { gap: spacing.section, padding: spacing.gutter, paddingBottom: spacing.xxl },
  section: { gap: spacing.md },
  card: { borderRadius: radius.card, borderWidth: 1, gap: 6, padding: spacing.lg },
  overline: typography.overline,
  name: typography.heading,
  line: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  meta: { ...typography.meta, flex: 1 },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  price: { ...typography.title, fontSize: 22, lineHeight: 26 },
  go: { alignItems: 'center', flexDirection: 'row', gap: 2, minHeight: 44 },
  goLabel: { ...typography.label, ...textWeight('700') },
  order: { alignItems: 'center', borderRadius: radius.card, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 64, padding: spacing.lg },
  orderText: { flex: 1, gap: spacing.xs },
  orderName: { ...typography.label, ...textWeight('700') },
})
