import { useRouter } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import type { PurchaseProduct } from '@/api/purchases'
import { Button } from '@/components/button'
import { price, purchaseDay } from '@/purchases/components'
import { productKey, productRoute } from '@/purchases/products'
import { usePurchaseEditions } from '@/purchases/queries'
import { useStackedLayout } from '@/theme/font-scale'
import { displayWeight, radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const SIDE = 136
const NOTCH = 24

/**
 * The benefits sold for this place, each as a ticket (audit A11): what it is,
 * until when it is valid, the price, and "Ver oferta" — the page's one
 * conversion colour. Public and optional: a failed or empty catalogue leaves
 * the rest of the page as it was.
 */
export function PlaceBenefits({
  citySlug,
  slug,
  timeZone,
}: {
  citySlug: string
  slug: string
  timeZone: string
}) {
  const catalog = usePurchaseEditions()
  const router = useRouter()
  const products = catalog.isError
    ? []
    : (catalog.data?.products.filter(
        (product) =>
          product.product_type === 'offer' &&
          product.purchasable &&
          product.city.slug === citySlug &&
          product.establishment?.slug === slug
      ) ?? [])
  if (products.length === 0) return null

  return (
    <View style={styles.list}>
      {products.map((product) => (
        <BenefitTicket
          key={productKey(product)}
          product={product}
          timeZone={timeZone}
          onPress={() => router.push(productRoute(product, 'establishment'))}
        />
      ))}
    </View>
  )
}

function BenefitTicket({
  product,
  timeZone,
  onPress,
}: {
  product: PurchaseProduct
  timeZone: string
  onPress: () => void
}) {
  const colors = useColors()
  const stacked = useStackedLayout()
  const offer = product.snapshot.offers[0]
  const amount = price(product.amount_cents, product.currency)
  const terms = [
    offer?.description,
    product.usage_ends_at ? `Válido até ${purchaseDay(product.usage_ends_at, timeZone)}.` : null,
  ]
    .filter(Boolean)
    .join(' ')

  const dashes = Array.from({ length: 9 }, (_, index) => (
    <View
      key={index}
      style={[stacked ? styles.dashAcross : styles.dash, { backgroundColor: colors.ctaAccent }]}
    />
  ))
  const notch = [styles.notch, { backgroundColor: colors.background }]

  return (
    <View
      accessibilityLabel="Benefício"
      testID={`benefit-${productKey(product)}`}
      style={[styles.ticket, stacked && styles.ticketStacked, { backgroundColor: colors.ctaSoft }]}
    >
      <View style={[styles.stub, stacked && styles.stubStacked]}>
        <Text style={[styles.overline, { color: colors.ctaAccent }]}>BENEFÍCIO</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {offer?.title || product.name}
        </Text>
        {terms ? <Text style={[styles.terms, { color: colors.ctaAccent }]}>{terms}</Text> : null}
      </View>
      {stacked ? (
        // With large text the stub tears across: the price and its action take the
        // full width below, so neither breaks mid-word in a narrow column.
        <View
          testID="benefit-cut"
          style={styles.cut}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={styles.cutDashes}>{dashes}</View>
          <View style={[notch, styles.cutStart]} />
          <View style={[notch, styles.cutEnd]} />
        </View>
      ) : (
        <View
          style={styles.perforation}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {dashes}
        </View>
      )}
      <View style={stacked ? styles.sideStacked : styles.side}>
        <Text style={[styles.price, { color: colors.foreground }]}>{amount}</Text>
        {/* A row, so the button fills the stub's width and not its height. */}
        <View style={styles.action}>
          <Button
            label="Ver oferta"
            variant="cta"
            size={44}
            fill
            accessibilityLabel={`Ver oferta · ${product.name} · ${amount}`}
            onPress={onPress}
          />
        </View>
      </View>
      {/* The two bites of a ticket stub, cut in the page's own colour. */}
      {stacked ? null : (
        <>
          <View style={[notch, styles.aside, styles.top]} />
          <View style={[notch, styles.aside, styles.bottom]} />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  ticket: { borderRadius: radius.card, flexDirection: 'row', overflow: 'hidden' },
  ticketStacked: { flexDirection: 'column' },
  stub: {
    flex: 1,
    gap: 6,
    paddingLeft: spacing.gutter,
    paddingRight: spacing.lg,
    paddingVertical: 18,
  },
  stubStacked: { flex: 0, paddingRight: spacing.gutter },
  // The tear across a stacked ticket: a dashed line with a bite at each edge.
  cut: { height: 2, justifyContent: 'center' },
  cutDashes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
  },
  dashAcross: { borderRadius: 1, height: 2, opacity: 0.35, width: 6 },
  cutStart: { left: -NOTCH / 2, top: 1 - NOTCH / 2 },
  cutEnd: { right: -NOTCH / 2, top: 1 - NOTCH / 2 },
  sideStacked: {
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: spacing.gutter,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.lg,
  },
  overline: typography.overline,
  title: { ...typography.title, fontSize: 22, lineHeight: 26 },
  terms: typography.meta,
  perforation: { justifyContent: 'space-between', paddingVertical: spacing.lg, width: 2 },
  dash: { borderRadius: 1, height: 6, opacity: 0.35, width: 2 },
  side: {
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    width: SIDE,
  },
  action: { alignSelf: 'stretch', flexDirection: 'row' },
  price: { ...typography.heading, ...displayWeight('800'), fontSize: 20 },
  notch: { borderRadius: NOTCH / 2, height: NOTCH, position: 'absolute', width: NOTCH },
  aside: { right: SIDE - NOTCH / 2 + 1 },
  top: { top: -NOTCH / 2 },
  bottom: { bottom: -NOTCH / 2 },
})
