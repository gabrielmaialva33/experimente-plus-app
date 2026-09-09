import { useMutation } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import { View } from 'react-native'

import { ChoiceControl } from '@/components/choice-control'
import { createPurchase } from '@/api/purchases'
import type { PaymentMethod } from '@/api/purchases'
import { EditionTerms, PurchaseAction, PurchasePage, PurchaseText, RetryPurchase, price } from '@/purchases/components'
import { productIdentity, productLabel } from '@/purchases/products'
import { clearIntent, purchaseIntent, readIntent } from '@/purchases/intent-store'
import { usePurchaseEditions, usePurchaseScope, usePurchases } from '@/purchases/queries'

export default function PurchaseProductScreen() {
  const { id, offerId } = useLocalSearchParams<{ id: string; offerId?: string }>()
  const { userId } = usePurchaseScope()
  const identity = productIdentity(id, offerId)
  if (!identity) return <PurchasePage><PurchaseText>Este produto não está disponível agora.</PurchaseText></PurchasePage>
  return <Product key={`${userId}:${identity.editionId}:${identity.offerId}`} {...identity} />
}

function Product({ editionId, offerId }: { editionId: number; offerId: number | null }) {
  const router = useRouter()
  const { userId } = usePurchaseScope()
  const catalog = usePurchaseEditions()
  const orders = usePurchases()
  const product = catalog.data?.products.find((item) => item.edition_id === editionId && item.offer_id === offerId)
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  // The server requires a tokenized card; this client has no tokenization flow.
  const needsCardToken = method === 'card'
  const [accepted, setAccepted] = useState<string | null>(null)
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
    onSuccess: (order) => router.replace(`/wallet/pedido/${encodeURIComponent(order.id)}`),
  })

  const submit = async () => {
    if (sending.current) return
    sending.current = true
    try { await start.mutateAsync() } catch { /* Generic recovery below; never echo financial payloads. */ }
    finally { sending.current = false }
  }

  if (catalog.isPending && !prior && !existing) return <PurchasePage><PurchaseText>Carregando produto…</PurchaseText></PurchasePage>
  if ((catalog.isError || !product) && !prior && !existing) return <PurchasePage>
    <PurchaseText>Este produto não está disponível agora.</PurchaseText>
    <RetryPurchase error={catalog.error} onRetry={() => void catalog.refetch()} />
  </PurchasePage>

  return (
    <PurchasePage>
      {product ? <>
        <PurchaseText heading>{productLabel(product)}</PurchaseText>
        <EditionTerms snapshot={product.snapshot} />
        <PurchaseText heading>{price(product.amount_cents, product.currency)}</PurchaseText>
      </> : <PurchaseText>Este produto não está disponível para novas compras.</PurchaseText>}
      {!userId ? <>
        <PurchaseText>Entre para comprar. Explorar lugares continua livre.</PurchaseText>
        <PurchaseAction label="Entrar para comprar" onPress={() => router.push('/compra/entrar')} />
      </> : existing ? <>
        <PurchaseText>Você já tem um pedido deste produto. Acompanhe seu estado antes de qualquer nova tentativa.</PurchaseText>
        <PurchaseAction label="Acompanhar pedido" onPress={() => router.push(`/wallet/pedido/${encodeURIComponent(existing.id)}`)} />
      </> : orders.isError ? <>
        <PurchaseText>Consulte os pedidos antes de iniciar uma compra.</PurchaseText>
        <RetryPurchase error={orders.error} onRetry={() => void orders.refetch()} />
      </> : orders.isPending ? <PurchaseText>Consultando seus pedidos…</PurchaseText> : prior || start.isError ? <>
        <PurchaseText>Não recebemos a confirmação do pedido. Isso não significa que o pagamento falhou. Consulte seus pedidos ou retome a mesma solicitação.</PurchaseText>
        <PurchaseAction label="Meus pedidos" onPress={() => router.push('/wallet/edicoes')} />
        <PurchaseText>A retomada mantém o valor e as condições da solicitação original.</PurchaseText>
        {start.isPending ? <PurchaseText>Retomando pedido…</PurchaseText> :
          <RetryPurchase error={start.error} onRetry={() => void submit()} />}
      </> : product ? <>
        {!product.purchasable ? <PurchaseText>Compra indisponível no momento.</PurchaseText> : null}
        {!product.payment_methods.length ? <PurchaseText>Os meios de pagamento ainda não estão disponíveis. Consulte novamente mais tarde.</PurchaseText> : null}
        <View accessibilityRole="radiogroup" accessibilityLabel="Meio de pagamento">
          {product.payment_methods.map((option) => <ChoiceControl key={option} shape="segment" role="radio" selected={method === option}
            label={option}
            disabled={start.isPending} onPress={() => setMethod(option)} />)}
        </View>
        {needsCardToken ? <PurchaseText>Este meio de pagamento ainda não pode ser iniciado pelo aplicativo.</PurchaseText> : null}
        <ChoiceControl shape="segment" role="checkbox" selected={accepted === product.terms_version} label={accepted === product.terms_version ? 'Condições lidas e aceitas' : 'Li e aceito as condições deste produto'}
          disabled={start.isPending} onPress={() => setAccepted(accepted === product.terms_version ? null : product.terms_version)} />
        <PurchaseAction label={start.isPending ? 'Iniciando pedido…' : 'Iniciar compra'} conversion
          disabled={!userId || !product.purchasable || !/^[a-f0-9]{64}$/.test(product.terms_version) || !method || needsCardToken || !product.payment_methods.includes(method) || accepted !== product.terms_version || start.isPending}
          onPress={() => void submit()} />
      </> : null}
    </PurchasePage>
  )
}
