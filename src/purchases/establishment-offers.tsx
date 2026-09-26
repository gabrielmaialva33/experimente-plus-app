import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/button'
import { price } from '@/purchases/components'
import { productKey, productRoute } from '@/purchases/products'
import { usePurchaseEditions } from '@/purchases/queries'
import { radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/** This public, optional section cannot gate discovery or the contact actions. */
export function EstablishmentOffers({ citySlug, slug }: { citySlug: string; slug: string }) {
  const catalog = usePurchaseEditions()
  const router = useRouter()
  const colors = useColors()
  const products = catalog.isError ? [] : catalog.data?.products.filter((product) =>
    product.product_type === 'offer' && product.purchasable &&
    product.city.slug === citySlug && product.establishment.slug === slug
  ) ?? []
  if (!products.length) return null
  // The benefit plane of direction A (ctaSoft); "Ver oferta" is conversion, so it is the CTA.
  return <View style={[styles.section, { backgroundColor: colors.ctaSoft }]}>
    <View style={styles.kind}>
      <Ionicons name="ticket-outline" size={16} color={colors.ctaAccent} />
      <Text style={[styles.overline, { color: colors.ctaAccent }]}>Benefício</Text>
    </View>
    <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>Vouchers deste lugar</Text>
    {products.map((product) => {
      const amount = price(product.amount_cents, product.currency)
      return (
        <View key={productKey(product)} style={[styles.offer, { backgroundColor: colors.card }]}>
          <View style={styles.offerText}>
            <Text style={[styles.name, { color: colors.foreground }]}>{product.name}</Text>
            <Text style={[styles.price, { color: colors.ctaAccent }]}>{amount}</Text>
          </View>
          <Button label="Ver oferta" variant="cta" size={44} accessibilityLabel={`Ver oferta · ${product.name} · ${amount}`}
            onPress={() => router.push(productRoute(product, 'establishment'))} />
        </View>
      )
    })}
  </View>
}

const styles = StyleSheet.create({
  section: { borderRadius: radius.card, gap: spacing.sm, marginHorizontal: spacing.gutter, marginTop: spacing.lg, padding: spacing.lg },
  kind: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  overline: typography.overline,
  title: typography.title,
  offer: { alignItems: 'center', borderRadius: radius.thumb, flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs, padding: spacing.md },
  offerText: { flex: 1, gap: 2 },
  name: { ...typography.label, ...textWeight('700') },
  price: { ...typography.meta, ...textWeight('700') },
})
