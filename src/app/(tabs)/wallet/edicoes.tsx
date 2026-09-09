import { useRouter } from 'expo-router'

import { PurchaseAction, PurchasePage, PurchaseText, RetryPurchase, price } from '@/purchases/components'
import { productKey, productLabel, productRoute } from '@/purchases/products'
import { ORDER_COPY, orderState } from '@/purchases/order-state'
import { usePurchaseEditions, usePurchases } from '@/purchases/queries'

export default function PurchaseEditionsScreen() {
  const router = useRouter()
  const editions = usePurchaseEditions()
  const orders = usePurchases()

  return (
    <PurchasePage>
      <PurchaseText heading>Pacotes e vouchers</PurchaseText>
      <PurchaseText>Explorar lugares é livre. Comprar um pacote ou voucher é opcional.</PurchaseText>
      {editions.isPending ? <PurchaseText>Carregando produtos…</PurchaseText> : null}
      {editions.isError ? <>
        <PurchaseText>Os produtos não estão disponíveis agora. Você pode continuar explorando.</PurchaseText>
        <RetryPurchase error={editions.error} onRetry={() => void editions.refetch()} />
      </> : null}
      {editions.data?.products.length === 0 ? <PurchaseText>Nenhum produto disponível no momento.</PurchaseText> : null}
      {editions.data?.products.map((product) => (
        <PurchaseAction key={productKey(product)} label={`${productLabel(product)} · ${product.name} · ${price(product.amount_cents, product.currency)}`}
          onPress={() => router.push(productRoute(product, 'wallet'))} />
      ))}
      <PurchaseText heading>Meus pedidos</PurchaseText>
      {orders.isPending ? <PurchaseText>Carregando pedidos…</PurchaseText> : null}
      {orders.isError ? <>
        <PurchaseText>Não foi possível consultar os pedidos. Consulte antes de iniciar uma nova compra.</PurchaseText>
        <RetryPurchase error={orders.error} onRetry={() => void orders.refetch()} />
      </> : null}
      {orders.data?.purchases.length === 0 ? <PurchaseText>Você ainda não tem pedidos.</PurchaseText> : null}
      {orders.data?.purchases.map((order) => (
        <PurchaseAction key={order.id} label={`${order.snapshot.name} · ${ORDER_COPY[orderState(order)].title}`}
          onPress={() => router.push(`/wallet/pedido/${encodeURIComponent(order.id)}`)} />
      ))}
    </PurchasePage>
  )
}
