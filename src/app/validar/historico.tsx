import { listPartnerRedemptions } from '@/api/redemptions'
import { AccessGate } from '@/wallet/access-gate'
import { HistoryScreen } from '@/wallet/history-screen'
import { partnerKeys } from '@/wallet/queries'

export default function PartnerHistoryScreen() {
  return (
    <AccessGate area="history" loadingLabel="Carregando histórico">
      <HistoryScreen
        queryKey={partnerKeys.redemptions}
        load={listPartnerRedemptions}
        emptyMessage="Nenhuma utilização registrada ainda"
        receiptHref={(code) => ({ pathname: '/validar/comprovante/[code]', params: { code } })}
      />
    </AccessGate>
  )
}
