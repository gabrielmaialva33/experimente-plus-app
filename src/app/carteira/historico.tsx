import { listMyRedemptions } from '@/api/wallet'
import { HistoryScreen } from '@/wallet/history-screen'

export default function WalletHistoryScreen() {
  return (
    <HistoryScreen
      queryKey={['wallet', 'redemptions']}
      load={listMyRedemptions}
      emptyMessage="Você ainda não utilizou nenhum benefício."
      emptyHint="Quando você usar um benefício, o comprovante fica guardado aqui."
      emptyAction={{ label: 'Ver meus benefícios', href: '/wallet' }}
      receiptHref={(code) => ({ pathname: '/carteira/comprovante/[code]', params: { code } })}
    />
  )
}
