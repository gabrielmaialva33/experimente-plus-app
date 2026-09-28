import { useLocalSearchParams } from 'expo-router'

import { getMyReceipt } from '@/api/wallet'
import { AccessGate } from '@/wallet/access-gate'
import { walletKeys } from '@/wallet/queries'
import { ReceiptScreen } from '@/wallet/receipt-screen'

export default function WalletReceiptScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()

  return (
    <AccessGate area="account" loadingLabel="Carregando comprovante">
      <ReceiptScreen queryKey={walletKeys.receipt(code)} load={() => getMyReceipt(code)} />
    </AccessGate>
  )
}
