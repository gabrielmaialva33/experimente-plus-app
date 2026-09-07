import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createPresentation, getWallet } from '@/api/wallet'
import { apiBaseUrl } from '@/api/config'
import { useSession } from '@/session/context'
import { FINANCIAL_RESTRICTION_MESSAGE, presentationEligibility } from './financial-restriction'

export const walletKeys = {
  wallet: ['wallet'] as const,
}

export const useWallet = (refetchInterval?: number) => {
  const { status, context } = useSession()
  return useQuery({
    queryKey: [...walletKeys.wallet, apiBaseUrl, context?.user.id],
    queryFn: getWallet,
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

  return useMutation({
    mutationFn: async ({ accessId, offerId }: { accessId: number; offerId: number }) => {
      // Always re-read before creating, including direct links and cached wallets.
      const wallet = await getWallet()
      const eligibility = presentationEligibility(wallet, accessId, offerId)
      if (eligibility.blocked) throw new FinancialRestrictionError(FINANCIAL_RESTRICTION_MESSAGE)
      if (!eligibility.allowed) throw new Error('Benefit unavailable')
      return createPresentation(accessId, offerId)
    },
    gcTime: 0,
    onSuccess: () => client.invalidateQueries({ queryKey: walletKeys.wallet }),
  })
}
