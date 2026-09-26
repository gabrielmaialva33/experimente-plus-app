import Ionicons from '@expo/vector-icons/Ionicons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { setStatusBarStyle } from 'expo-status-bar'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { createPurchase } from '@/api/purchases'
import type { PaymentMethod, PurchaseProduct } from '@/api/purchases'
import { Button } from '@/components/button'
import { ScreenHeader } from '@/components/screen-header'
import { StickyFooter } from '@/components/sticky-footer'
import { ConditionsDetail, PurchaseAction, RetryPurchase, price, usageWindow } from '@/purchases/components'
import { productIdentity, productLabel } from '@/purchases/products'
import { clearIntent, purchaseIntent, readIntent } from '@/purchases/intent-store'
import { usePurchaseEditions, usePurchaseScope, usePurchases } from '@/purchases/queries'
import { minTouch, radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const METHOD_LABEL: Record<string, string> = { pix: 'Pix', card: 'Cartão de crédito' }
const METHOD_HINT: Record<string, string> = { pix: 'O código Pix aparece no próximo passo' }
// The server needs a tokenized card and this client has no tokenization flow,
// so the card is shown — the person learns it exists — but cannot be chosen.
const STARTABLE_METHODS = new Set(['pix'])

const count = (value: number, one: string, many: string) => `${value} ${value === 1 ? one : many}`

export default function PurchaseProductScreen() {
  const colors = useColors()
  const { id, offerId } = useLocalSearchParams<{ id: string; offerId?: string }>()
  const { userId } = usePurchaseScope()
  const identity = productIdentity(id, offerId)

  // The native bar and the band below it read as one navy plane; the band carries the title.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light')
      return () => setStatusBarStyle('auto')
    }, [])
  )
  const chrome = (
    <Stack.Screen options={{
      headerTitle: '', headerStyle: { backgroundColor: colors.chrome },
      headerTintColor: colors.chromeForeground, headerShadowVisible: false,
    }} />
  )

  if (!identity) return <>{chrome}<Notice><Body>Este produto não está disponível agora.</Body></Notice></>
  return <>{chrome}<Product key={`${userId}:${identity.editionId}:${identity.offerId}`} {...identity} /></>
}

/** A state with nothing to buy yet: the band closes the header, the sentence says why. */
function Notice({ children }: { children: ReactNode }) {
  const colors = useColors()
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <ScreenHeader insetTop={false} />
      <View style={styles.content}>{children}</View>
    </ScrollView>
  )
}

function Product({ editionId, offerId }: { editionId: number; offerId: number | null }) {
  const colors = useColors()
  const router = useRouter()
  const client = useQueryClient()
  const { userId } = usePurchaseScope()
  const catalog = usePurchaseEditions()
  const orders = usePurchases()
  const product = catalog.data?.products.find((item) => item.edition_id === editionId && item.offer_id === offerId)
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  // The server requires a tokenized card; this client has no tokenization flow.
  const needsCardToken = method === 'card'
  const [accepted, setAccepted] = useState<string | null>(null)
  const [conditionsOpen, setConditionsOpen] = useState(false)
  const scroll = useRef<ScrollView>(null)
  const whenY = useRef(0)
  const sending = useRef(false)
  const existing = orders.data?.purchases.find((order) => order.edition_id === editionId && order.offer_id === offerId)
  const prior = userId ? readIntent(userId, editionId, offerId) : null

  const start = useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async () => {
      if (!userId) throw new Error('Purchase unavailable')
      // An interrupted POST must replay its original quote and method, even if
      // today's catalog changed. The server detects conflicts and late payments.
      let intent = readIntent(userId, editionId, offerId)
      if (!intent) {
        if (!product || !product.purchasable || !/^[a-f0-9]{64}$/.test(product.terms_version) || accepted !== product.terms_version ||
          !method || needsCardToken || !product.payment_methods.includes(method)) throw new Error('Purchase unavailable')
        intent = purchaseIntent(userId, {
          edition_id: product.edition_id, offer_id: product.offer_id, amount_cents: product.amount_cents,
          terms_version: product.terms_version, method,
        })
      }
      const result = await createPurchase(intent.body, intent.key)
      if (!result || typeof result.id !== 'string' || !result.id) throw new Error('Purchase identity unavailable')
      clearIntent(userId, intent.body.edition_id, intent.body.offer_id)
      return result
    },
    onSuccess: (order) => {
      // A list of orders still mounted underneath would otherwise say there are none.
      void client.invalidateQueries({ queryKey: ['purchases'] })
      router.replace(`/wallet/pedido/${encodeURIComponent(order.id)}`)
    },
  })

  const submit = async () => {
    if (sending.current) return
    sending.current = true
    try { await start.mutateAsync() } catch { /* Generic recovery below; never echo financial payloads. */ }
    finally { sending.current = false }
  }

  // The consent names the conditions, so it opens them where they are (A31).
  const readConditions = () => {
    setConditionsOpen(true)
    scroll.current?.scrollTo({ y: whenY.current, animated: true })
  }

  if (catalog.isPending && !prior && !existing) return <Notice><Body>Carregando produto…</Body></Notice>
  if ((catalog.isError || !product) && !prior && !existing) return <Notice>
    <Body>Este produto não está disponível agora.</Body>
    <RetryPurchase error={catalog.error} onRetry={() => void catalog.refetch()} />
  </Notice>

  const buying = Boolean(product && userId && !existing && !orders.isError && !orders.isPending && !prior && !start.isError)
  const ready = Boolean(product && userId && product.purchasable && /^[a-f0-9]{64}$/.test(product.terms_version) && method &&
    !needsCardToken && product.payment_methods.includes(method) && accepted === product.terms_version && !start.isPending)
  const noun = product?.product_type === 'offer' ? 'voucher' : 'pacote'

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView ref={scroll} contentContainerStyle={styles.page}>
        {product ? <ProductHeader product={product} /> : <ScreenHeader insetTop={false} />}
        <View style={styles.content}>
          {product ? <>
            {product.snapshot.description ? <Text style={[styles.lead, { color: colors.foreground }]}>{product.snapshot.description}</Text> : null}
            <Included product={product} />
            <View onLayout={(event) => { whenY.current = event.nativeEvent.layout.y }}>
              <WhenToUse product={product} open={conditionsOpen} onToggle={() => setConditionsOpen(!conditionsOpen)} />
            </View>
          </> : <Body>Este produto não está disponível para novas compras.</Body>}

          {!userId ? (
            <Body>Entre para comprar. Explorar lugares continua livre.</Body>
          ) : existing ? (
            <Body>Você já tem um pedido deste produto. Acompanhe seu estado antes de qualquer nova tentativa.</Body>
          ) : orders.isError ? <>
            <Body>Consulte os pedidos antes de iniciar uma compra.</Body>
            <RetryPurchase error={orders.error} onRetry={() => void orders.refetch()} />
          </> : orders.isPending ? <Body>Consultando seus pedidos…</Body> : prior || start.isError ? <>
            <Body>Não recebemos a confirmação do pedido. Isso não significa que o pagamento falhou. Consulte seus pedidos ou retome a mesma solicitação.</Body>
            <PurchaseAction label="Meus pedidos" onPress={() => router.push('/wallet/edicoes')} />
            <Body>A retomada mantém o valor e as condições da solicitação original.</Body>
            {start.isPending ? <Body>Retomando pedido…</Body> :
              <RetryPurchase error={start.error} onRetry={() => void submit()} />}
          </> : product ? <>
            {!product.purchasable ? <Body>Compra indisponível no momento.</Body> : null}
            {!product.payment_methods.length ? <Body>Os meios de pagamento ainda não estão disponíveis. Consulte novamente mais tarde.</Body> : null}
            <View style={styles.section}>
              {product.payment_methods.length ? <SectionTitle>Forma de pagamento</SectionTitle> : null}
              <View accessibilityRole="radiogroup" accessibilityLabel="Forma de pagamento" style={styles.methods}>
                {product.payment_methods.map((option) => <PaymentOption key={option} method={option} selected={method === option}
                  disabled={start.isPending} onPress={() => setMethod(option)} />)}
              </View>
              {needsCardToken ? <Body>Este meio de pagamento ainda não pode ser iniciado pelo aplicativo.</Body> : null}
            </View>
            <View style={styles.consentBlock}>
              <Consent label={`Li e aceito as condições deste ${noun}`} checked={accepted === product.terms_version}
                disabled={start.isPending} onToggle={() => setAccepted(accepted === product.terms_version ? null : product.terms_version)} />
              <Pressable accessibilityRole="button" onPress={readConditions} style={[styles.link, styles.consentLink]}>
                <Text style={[styles.linkLabel, { color: colors.primary }]}>Ler as condições</Text>
              </Pressable>
            </View>
          </> : null}
        </View>
      </ScrollView>

      {/* The price sits beside the action that pays it (A30). */}
      {product ? (
        <StickyFooter testID="purchase-footer" caption="Total" value={price(product.amount_cents, product.currency)}>
          {!userId ? (
            <Button label="Entrar para comprar" size={52} fill onPress={() => router.push('/compra/entrar')} />
          ) : existing ? (
            <Button label="Acompanhar pedido" size={52} fill
              onPress={() => router.push(`/wallet/pedido/${encodeURIComponent(existing.id)}`)} />
          ) : buying ? (
            <Button label={start.isPending ? 'Iniciando pedido…' : 'Continuar para o pagamento'} variant="cta" size={52} fill
              disabled={!ready} onPress={() => void submit()} />
          ) : null}
        </StickyFooter>
      ) : null}
    </View>
  )
}

function ProductHeader({ product }: { product: PurchaseProduct }) {
  const colors = useColors()
  const offers = product.snapshot.offers
  const subtitle = product.product_type === 'offer'
    ? `Benefício em ${product.establishment.public_name}, ${product.city.name}`
    : `${count(offers.length, 'benefício', 'benefícios')} em lugares de ${product.city.name}`

  return (
    <ScreenHeader
      insetTop={false}
      eyebrow={
        <View style={[styles.kind, { backgroundColor: colors.chromeRaised }]}>
          <Text style={[styles.kindLabel, { color: colors.chromeForeground }]}>{productLabel(product)}</Text>
        </View>
      }
      title={product.snapshot.name}
      subtitle={subtitle}
    />
  )
}

/** Each benefit the purchase grants, by place: what, where and how many uses. */
function Included({ product }: { product: PurchaseProduct }) {
  const colors = useColors()
  const offers = product.snapshot.offers
  // One count for every place reads once, below; different counts go on each row.
  const mixed = new Set(offers.map((offer) => offer.max_redemptions_per_access)).size > 1

  return (
    <View style={styles.section}>
      <SectionTitle>O que está incluído</SectionTitle>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
        {offers.map((offer, index) => (
          <View key={offer.id} style={[styles.included, index > 0 && { borderTopColor: colors.muted, borderTopWidth: 1 }]}>
            <View style={[styles.tile, { backgroundColor: colors.ctaSoft }]}>
              <Ionicons name="ticket-outline" size={24} color={colors.ctaAccent} />
            </View>
            <View style={styles.includedText}>
              <Text style={[styles.place, { color: colors.foreground }]}>{offer.establishment.public_name}</Text>
              <Text style={[styles.benefit, { color: colors.ctaAccent }]}>
                {mixed ? `${offer.title} · ${count(offer.max_redemptions_per_access, 'uso', 'usos')}` : offer.title}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

function WhenToUse({ product, open, onToggle }: { product: PurchaseProduct; open: boolean; onToggle: () => void }) {
  const colors = useColors()
  const timeZone = product.city?.timezone ?? undefined
  const window = usageWindow(product.snapshot, timeZone)
  const offers = product.snapshot.offers
  const uses = [...new Set(offers.map((offer) => offer.max_redemptions_per_access))]
  const line = [
    window.useFrom ? `Uso a partir de ${window.useFrom}` : null,
    uses.length === 1
      ? `${count(uses[0], 'uso', 'usos')} ${product.product_type === 'offer' ? 'por pessoa' : 'por lugar'}`
      : null,
  ].filter(Boolean).join(' · ')

  return (
    <View testID="purchase-when" style={styles.section}>
      <SectionTitle>Quando usar</SectionTitle>
      <View style={styles.tiles}>
        {([['Compre até', window.buyUntil], ['Use até', window.useUntil]] as const).map(([label, value]) => (
          <View key={label} style={[styles.dateTile, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.tileLabel, { color: colors.mutedForeground }]}>{label}</Text>
            <Text style={[styles.tileValue, { color: colors.foreground }]}>{value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.usesRow}>
        {line ? <Text style={[styles.meta, { color: colors.mutedForeground }]}>{`${line}.`}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.link}>
          <Text style={[styles.linkLabel, { color: colors.primary }]}>{open ? 'Ocultar condições' : 'Ver condições'}</Text>
        </Pressable>
      </View>
      {open ? (
        <View style={[styles.card, styles.conditions, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          <ConditionsDetail snapshot={product.snapshot} timeZone={timeZone} />
        </View>
      ) : null}
    </View>
  )
}

/** A radio card with its state drawn, not implied; an unavailable method says why before any tap. */
function PaymentOption({ method, selected, disabled, onPress }: {
  method: PaymentMethod; selected: boolean; disabled: boolean; onPress: () => void
}) {
  const colors = useColors()
  const startable = STARTABLE_METHODS.has(method)
  const unavailable = disabled || !startable
  const label = METHOD_LABEL[method] ?? method
  const hint = startable ? METHOD_HINT[method] : 'Em breve pelo aplicativo'

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={startable ? label : `${label}, em breve pelo aplicativo`}
      accessibilityState={{ checked: selected, selected, disabled: unavailable }}
      disabled={unavailable}
      onPress={onPress}
      style={[styles.method, {
        borderWidth: selected ? 2 : 1.5,
        borderColor: selected ? colors.choiceSelectedBorder : colors.border,
        backgroundColor: selected ? colors.choiceSelected : colors.choiceBackground,
      }]}>
      <View style={[styles.radio, { borderColor: unavailable ? colors.mutedForeground : colors.primary }]}>
        {selected ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
      </View>
      <View style={styles.methodText}>
        <Text style={[styles.methodLabel, { color: unavailable ? colors.mutedForeground : colors.foreground }]}>{label}</Text>
        {hint ? <Text style={[styles.meta, { color: colors.mutedForeground }]}>{hint}</Text> : null}
      </View>
    </Pressable>
  )
}

/** A checkbox drawn as one: a box that fills, a label that stays the same. */
function Consent({ label, checked, disabled, onToggle }: { label: string; checked: boolean; disabled: boolean; onToggle: () => void }) {
  const colors = useColors()
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={styles.consent}>
      <View style={[styles.box, {
        borderColor: disabled ? colors.mutedForeground : colors.primary,
        backgroundColor: checked ? colors.primary : colors.card,
      }]}>
        {checked ? <Ionicons name="checkmark" size={16} color={colors.primaryForeground} /> : null}
      </View>
      <Text style={[styles.consentLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  const colors = useColors()
  return <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.foreground }]}>{children}</Text>
}

function Body({ children }: { children: ReactNode }) {
  const colors = useColors()
  return <Text style={[typography.body, { color: colors.foreground }]}>{children}</Text>
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { paddingBottom: spacing.xl },
  content: { gap: spacing.xl, paddingHorizontal: spacing.gutter, paddingTop: 22 },
  lead: typography.body,
  kind: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: radius.pill, flexDirection: 'row', minHeight: 28, paddingHorizontal: spacing.md },
  kindLabel: typography.overline,
  section: { gap: spacing.md },
  sectionTitle: { ...typography.title, fontSize: 20, lineHeight: 25 },
  card: { borderRadius: radius.card, borderWidth: 1 },
  included: { alignItems: 'center', flexDirection: 'row', gap: 14, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  tile: { alignItems: 'center', borderRadius: 14, height: 52, justifyContent: 'center', width: 52 },
  includedText: { flex: 1, gap: 2 },
  place: { ...typography.body, ...textWeight('700') },
  benefit: { ...typography.meta, ...textWeight('700') },
  tiles: { flexDirection: 'row', gap: 10 },
  dateTile: { borderRadius: 18, borderWidth: 1, flex: 1, gap: 2, padding: 14 },
  tileLabel: typography.caption,
  tileValue: { ...typography.heading, fontFamily: typography.title.fontFamily },
  usesRow: { alignItems: 'center', columnGap: spacing.sm, flexDirection: 'row', flexWrap: 'wrap' },
  meta: typography.meta,
  link: { justifyContent: 'center', minHeight: minTouch },
  linkLabel: { ...typography.label, ...textWeight('700') },
  conditions: { padding: spacing.lg },
  methods: { gap: spacing.md },
  method: {
    alignItems: 'center', borderRadius: 18, flexDirection: 'row', gap: 14,
    minHeight: 64, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  radio: { alignItems: 'center', borderRadius: 11, borderWidth: 2, height: 22, justifyContent: 'center', width: 22 },
  dot: { borderRadius: 5, height: 10, width: 10 },
  methodText: { flexShrink: 1, gap: 2 },
  methodLabel: { ...typography.body, ...textWeight('700') },
  consentBlock: { gap: 0 },
  // Under the label, not the box: it belongs to the words it opens.
  consentLink: { alignSelf: 'flex-start', marginLeft: 22 + spacing.md },
  consent: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, minHeight: minTouch, paddingVertical: spacing.xs },
  box: { alignItems: 'center', borderRadius: radius.sm + 2, borderWidth: 2, height: 22, justifyContent: 'center', marginTop: 1, width: 22 },
  consentLabel: { ...typography.label, ...textWeight('500'), flex: 1, lineHeight: 21 },
})
