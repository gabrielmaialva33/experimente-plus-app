import { useLocalSearchParams } from 'expo-router'

import { getMyReceipt } from '@/api/wallet'
import { ReceiptScreen } from '@/wallet/receipt-screen'

export default function WalletReceiptScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()

  return (
    <ReceiptScreen queryKey={['wallet', 'receipt', code]} load={() => getMyReceipt(code as string)} />
  )
}
