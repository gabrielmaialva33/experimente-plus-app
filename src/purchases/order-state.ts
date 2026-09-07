import { paymentInstructions, type Purchase } from '@/api/purchases'

export type OrderState = 'pending' | 'confirmed' | 'late_confirmation' | 'failed' | 'blocked' | 'refunded'

/** Presentation of server facts only. Device clock and checkout returns grant nothing. */
export function orderState(order: Purchase): OrderState {
  if (order.status === 'refunded') return 'refunded'
  if (order.financially_blocked) return 'blocked'
  if (order.status === 'review' || (order.paid_at && !order.access_id)) return 'late_confirmation'
  if (order.status === 'paid') return order.access_id ? 'confirmed' : 'late_confirmation'
  if (order.status === 'failed' || order.status === 'cancelled') return 'failed'
  return 'pending'
}

export const ORDER_COPY: Record<OrderState, { title: string; message: string }> = {
  pending: {
    title: 'Pedido pendente',
    message: 'Aguardando confirmação do pagamento. O pedido ainda não concede acesso à edição.',
  },
  confirmed: {
    title: 'Pagamento confirmado',
    message: 'Consulte a carteira para conferir o acesso, as datas de uso e a disponibilidade de cada benefício.',
  },
  late_confirmation: {
    title: 'Confirmação em análise',
    message: 'O pedido está em conferência. Uma confirmação tardia pode exigir análise. Aguarde a atualização; não inicie outro pagamento.',
  },
  failed: {
    title: 'Pedido não concluído',
    message: 'Este pedido não liberou acesso. Consulte novamente para acompanhar eventual confirmação tardia.',
  },
  blocked: {
    title: 'Acesso indisponível',
    message: 'O acesso está temporariamente indisponível para novos usos. Aguarde a atualização ou procure o suporte da operação.',
  },
  refunded: {
    title: 'Pedido reembolsado',
    message: 'Consulte o estado atual na carteira. Seus comprovantes de utilização permanecem no histórico.',
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
