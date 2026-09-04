import { listPartnerRedemptions } from '@/api/redemptions'
import { HistoryScreen } from '@/wallet/history-screen'

export default function PartnerHistoryScreen() {
  return (
    <HistoryScreen
      queryKey={['partner', 'redemptions']}
      load={listPartnerRedemptions}
      emptyMessage="Nenhuma utilização registrada ainda."
      receiptHref={(code) => ({ pathname: '/validar/comprovante/[code]', params: { code } })}
    />
  )
}
