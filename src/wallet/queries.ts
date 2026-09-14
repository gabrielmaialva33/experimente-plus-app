import { useQuery, useQueryClient } from '@tanstack/react-query'

import { createPresentation, getWallet } from '@/api/wallet'
import { apiBaseUrl } from '@/api/config'
import { useSession } from '@/session/context'
import { usePrivateOperation } from './use-private-operation'
import { FINANCIAL_RESTRICTION_MESSAGE, presentationEligibility } from './financial-restriction'

export const walletKeys = {
  wallet: ['wallet'] as const,
}

export const useWallet = (refetchInterval?: number) => {
  const { status, context } = useSession()
  return useQuery({
    queryKey: [...walletKeys.wallet, apiBaseUrl, context?.user.id],
    queryFn: ({ signal }) => getWallet(signal),
    enabled: status === 'authenticated',
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchInterval: (query) => query.state.error ? false : refetchInterval ?? false,
  })
}

export class FinancialRestrictionError extends Error {}

/**
 * Creating a presentation is never retried automatically: it consumes server
 * state and the retry contract requires human intent.
 */
export function useCreatePresentation() {
  const client = useQueryClient()

  return usePrivateOperation(async ({ accessId, offerId }: { accessId: number; offerId: number }, signal) => {
    // Recheck eligibility before every explicit presentation, without caching its response.
    const wallet = await getWallet(signal)
    if (signal.aborted) return Promise.reject(new Error('Presentation cancelled'))
    const eligibility = presentationEligibility(wallet, accessId, offerId)
    if (eligibility.blocked) throw new FinancialRestrictionError(FINANCIAL_RESTRICTION_MESSAGE)
    if (!eligibility.allowed) throw new Error('Benefit unavailable')
    const result = await createPresentation(accessId, offerId, signal)
    if (!signal.aborted) void client.invalidateQueries({ queryKey: walletKeys.wallet })
    return result
  })
}
