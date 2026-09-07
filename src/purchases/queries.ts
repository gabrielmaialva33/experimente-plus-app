import { useQuery } from '@tanstack/react-query'

import { apiBaseUrl } from '@/api/config'
import { getPurchase, listPurchaseEditions, listPurchases } from '@/api/purchases'
import { useSession } from '@/session/context'

export function usePurchaseScope() {
  const { status, context } = useSession()
  return { userId: status === 'authenticated' ? context?.user.id : undefined, operation: apiBaseUrl }
}

export const usePurchaseEditions = () => useQuery({
  queryKey: ['purchase-editions', apiBaseUrl],
  queryFn: listPurchaseEditions,
  staleTime: 0,
  retry: false,
})

export function usePurchases() {
  const { userId, operation } = usePurchaseScope()
  return useQuery({
    queryKey: ['purchases', operation, userId], queryFn: listPurchases,
    enabled: Boolean(userId), staleTime: 0, gcTime: 0, retry: false,
  })
}

export function usePurchase(id: string) {
  const { userId, operation } = usePurchaseScope()
  return useQuery({
    queryKey: ['purchase', operation, userId, id], queryFn: () => getPurchase(id),
    enabled: Boolean(userId && id), staleTime: 0, gcTime: 0, retry: false,
    // Reads only. Stop on errors (including 429); never turn polling into a POST.
    refetchInterval: (query) => query.state.error ? false : 15_000,
  })
}
