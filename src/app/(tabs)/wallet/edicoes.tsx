import { useRouter } from 'expo-router'

import { PurchaseAction, PurchasePage, PurchaseText, RetryPurchase, price } from '@/purchases/components'
import { ORDER_COPY, orderState } from '@/purchases/order-state'
import { usePurchaseEditions, usePurchases } from '@/purchases/queries'

export default function PurchaseEditionsScreen() {
  const router = useRouter()
  const editions = usePurchaseEditions()
  const orders = usePurchases()

  return (
    <PurchasePage>
      <PurchaseText heading>Conheça as edições</PurchaseText>
      <PurchaseText>Explorar lugares é livre. Comprar uma edição é opcional.</PurchaseText>
      {editions.isPending ? <PurchaseText>Carregando edições…</PurchaseText> : null}
      {editions.isError ? <>
        <PurchaseText>As edições não estão disponíveis agora. Você pode continuar explorando.</PurchaseText>
        <RetryPurchase error={editions.error} onRetry={() => void editions.refetch()} />
      </> : null}
      {editions.data?.editions.length === 0 ? <PurchaseText>Nenhuma edição disponível no momento.</PurchaseText> : null}
      {editions.data?.editions.map((edition) => (
        <PurchaseAction key={edition.id} label={`${edition.snapshot.name} · ${price(edition.amount_cents, edition.currency)}`}
          onPress={() => router.push(`/wallet/edicao/${edition.id}`)} />
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
