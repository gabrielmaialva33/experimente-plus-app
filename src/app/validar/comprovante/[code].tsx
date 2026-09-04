import { useLocalSearchParams } from 'expo-router'

import { getPartnerReceipt } from '@/api/redemptions'
import { ReceiptScreen } from '@/wallet/receipt-screen'

export default function PartnerReceiptScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()

  return (
    <ReceiptScreen
      queryKey={['partner', 'receipt', code]}
      load={() => getPartnerReceipt(code as string)}
    />
  )
}
