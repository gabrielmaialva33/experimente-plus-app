import { listMyRedemptions } from '@/api/wallet'
import { HistoryScreen } from '@/wallet/history-screen'

export default function WalletHistoryScreen() {
  return (
    <HistoryScreen
      queryKey={['wallet', 'redemptions']}
      load={listMyRedemptions}
      emptyMessage="Você ainda não utilizou nenhum benefício."
      receiptHref={(code) => ({ pathname: '/carteira/comprovante/[code]', params: { code } })}
    />
  )
}
