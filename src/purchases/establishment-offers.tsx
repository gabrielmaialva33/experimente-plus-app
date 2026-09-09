import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { PurchaseAction, PurchaseText, price } from '@/purchases/components'
import { productKey, productRoute } from '@/purchases/products'
import { usePurchaseEditions } from '@/purchases/queries'
import { radius, spacing } from '@/theme/tokens'
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
  return <View style={[styles.section, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
    <PurchaseText heading>Vouchers desta loja</PurchaseText>
    {products.map((product) => <PurchaseAction key={productKey(product)}
      label={`Ver voucher · ${product.name} · ${price(product.amount_cents, product.currency)}`}
      onPress={() => router.push(productRoute(product, 'establishment'))} />)}
  </View>
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderWidth: 1, borderRadius: radius.surface },
})
