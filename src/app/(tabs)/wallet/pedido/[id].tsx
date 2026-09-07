import { useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Linking, Text } from 'react-native'

import { paymentInstructions } from '@/api/purchases'
import { typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { EditionTerms, PurchaseAction, PurchasePage, PurchaseText, RetryPurchase, price } from '@/purchases/components'
import { checkoutUrl, ORDER_COPY, orderState } from '@/purchases/order-state'
import { usePurchase } from '@/purchases/queries'
import { walletKeys } from '@/wallet/queries'

export default function PurchaseOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const query = usePurchase(id)
  const client = useQueryClient()
  const order = query.data
  const state = order ? orderState(order) : null
  const [openingError, setOpeningError] = useState(false)
  const colors = useColors()

  useEffect(() => {
    if (order) void client.invalidateQueries({ queryKey: walletKeys.wallet })
  }, [client, order?.status, order?.access_id, order?.financially_blocked])

  if (query.isPending) return <PurchasePage><PurchaseText>Consultando pedido…</PurchaseText></PurchasePage>
  if (query.isError || !order || !state) return <PurchasePage>
    <PurchaseText>Não foi possível confirmar o estado do pedido. Não inicie outro pagamento por causa desta falha de conexão.</PurchaseText>
    <RetryPurchase error={query.error} onRetry={() => void query.refetch()} />
  </PurchasePage>

  const copy = ORDER_COPY[state]
  const url = checkoutUrl(order)
  const instructions = paymentInstructions(order)
  return (
    <PurchasePage>
      <PurchaseText heading>{copy.title}</PurchaseText>
      <PurchaseText>{copy.message}</PurchaseText>
      <PurchaseText>{price(order.amount_cents, order.currency)}</PurchaseText>
      {state === 'pending' && instructions.code ? <>
        <PurchaseText>Código de pagamento. Este código não apresenta um benefício.</PurchaseText>
        <Text selectable style={[typography.body, { color: colors.foreground }]}>{instructions.code}</Text>
      </> : null}
      {url ? <PurchaseAction label="Continuar pagamento" conversion onPress={() => {
        setOpeningError(false)
        // Opening/returning from checkout is not a payment event. Only GET updates state.
        void Linking.openURL(url).catch(() => setOpeningError(true))
      }} /> : null}
      {openingError ? <PurchaseText>Não foi possível abrir o pagamento. Consulte o pedido antes de tentar novamente.</PurchaseText> : null}
      <RetryPurchase error={null} onRetry={() => void query.refetch()} />
      {state === 'confirmed' ? <PurchaseAction label="Consultar carteira" onPress={() => router.navigate('/wallet')} /> : null}
      <EditionTerms snapshot={order.snapshot} />
    </PurchasePage>
  )
}
