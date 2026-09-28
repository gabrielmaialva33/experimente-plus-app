import { useLocalSearchParams } from 'expo-router'

import { getPartnerReceipt } from '@/api/redemptions'
import { AccessGate } from '@/wallet/access-gate'
import { partnerKeys } from '@/wallet/queries'
import { ReceiptScreen } from '@/wallet/receipt-screen'

export default function PartnerReceiptScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()

  return (
    <AccessGate area="history" loadingLabel="Carregando comprovante">
      <ReceiptScreen queryKey={partnerKeys.receipt(code)} load={() => getPartnerReceipt(code)} />
    </AccessGate>
  )
}
