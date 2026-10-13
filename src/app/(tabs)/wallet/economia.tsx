import { AccessGate } from '@/wallet/access-gate'
import { SavingsScreen } from '@/wallet/savings-screen'

export default function WalletSavingsScreen() {
  return (
    <AccessGate area="account" loadingLabel="Carregando sua economia">
      <SavingsScreen />
    </AccessGate>
  )
}
