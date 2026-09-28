import { listMyRedemptions } from '@/api/wallet'
import { AccessGate } from '@/wallet/access-gate'
import { HistoryScreen } from '@/wallet/history-screen'
import { walletKeys } from '@/wallet/queries'

export default function WalletHistoryScreen() {
  return (
    <AccessGate area="account" loadingLabel="Carregando histórico">
      <HistoryScreen
        queryKey={walletKeys.redemptions}
        load={listMyRedemptions}
        emptyMessage="Você ainda não utilizou nenhum benefício"
        emptyHint="Quando você usar um benefício, o comprovante fica guardado aqui."
        emptyAction={{ label: 'Ver meus benefícios', href: '/wallet' }}
        receiptHref={(code) => ({ pathname: '/carteira/comprovante/[code]', params: { code } })}
      />
    </AccessGate>
  )
}
