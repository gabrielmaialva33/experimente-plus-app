import { paymentInstructions, type Purchase } from '@/api/purchases'

export type OrderState =
  'pending' | 'confirmed' | 'late_confirmation' | 'failed' | 'blocked' | 'refunded'

/** Presentation of server facts only. Device clock and checkout returns grant nothing. */
export function orderState(order: Purchase): OrderState {
  if (order.status === 'refunded') return 'refunded'
  if (order.financially_blocked) return 'blocked'
  if (order.status === 'review' || (order.paid_at && !order.access_id)) return 'late_confirmation'
  if (order.status === 'paid') return order.access_id ? 'confirmed' : 'late_confirmation'
  if (order.status === 'failed' || order.status === 'cancelled') return 'failed'
  return 'pending'
}

/**
 * Whether an order still stands in the way of buying the same product again.
 *
 * The server refuses a new purchase while one is pending, paid or in review, or
 * once it granted access; a cancelled or failed order without access leaves the
 * product free to buy (`purchase_service`). Treating every past order as
 * blocking left a cancelled Pix order as the product's only way forward.
 */
export function blocksNewPurchase(order: Purchase): boolean {
  return (
    order.status === 'pending' ||
    order.status === 'paid' ||
    order.status === 'review' ||
    order.access_id != null
  )
}

export const ORDER_COPY: Record<OrderState, { title: string; message: string }> = {
  pending: {
    title: 'Pedido pendente',
    message:
      'Aguardando a confirmação do pagamento. Até lá, o pedido ainda não libera os benefícios.',
  },
  confirmed: {
    title: 'Pagamento confirmado',
    message:
      'Seus benefícios estão na carteira, com as datas de uso e a disponibilidade de cada um.',
  },
  late_confirmation: {
    title: 'Confirmação em análise',
    message:
      'O pedido está em conferência. Uma confirmação tardia pode exigir análise. Aguarde a atualização; não inicie outro pagamento.',
  },
  failed: {
    title: 'Pedido não concluído',
    message:
      'Este pedido não liberou benefícios. Consulte novamente para acompanhar uma eventual confirmação tardia.',
  },
  blocked: {
    title: 'Benefícios pausados',
    message:
      'Os benefícios desta compra estão temporariamente indisponíveis para novos usos. Aguarde a atualização ou procure o suporte da operação.',
  },
  refunded: {
    title: 'Pedido reembolsado',
    message:
      'Consulte o estado atual na carteira. Seus comprovantes de utilização permanecem no histórico.',
  },
}

export function checkoutUrl(order: Purchase): string | null {
  if (order.status !== 'pending' || orderState(order) !== 'pending') return null
  try {
    const url = new URL(paymentInstructions(order).url ?? '')
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null
  } catch {
    return null
  }
}
