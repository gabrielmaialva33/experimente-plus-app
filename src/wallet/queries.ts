import { useQuery, useQueryClient } from '@tanstack/react-query'

import { createPresentation, getWallet } from '@/api/wallet'
import { apiBaseUrl } from '@/api/config'
import { useSession } from '@/session/context'
import { presentationDeadline } from './countdown'
import { usePrivateOperation } from './use-private-operation'
import { FINANCIAL_RESTRICTION_MESSAGE, presentationEligibility } from './financial-restriction'
import type { Presentation } from './types'

/** A presentation as shown: the server's answer and when it ends on this device's clock. */
export type ShownPresentation = Presentation & { deadline: number }

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
    refetchInterval: (query) => (query.state.error ? false : (refetchInterval ?? false)),
  })
}

export class FinancialRestrictionError extends Error {}

/**
 * Creating a presentation is never retried automatically: it consumes server
 * state and the retry contract requires human intent.
 */
export function useCreatePresentation() {
  const client = useQueryClient()

  return usePrivateOperation(
    async (
      { accessId, offerId }: { accessId: number; offerId: number },
      signal
    ): Promise<ShownPresentation> => {
      // Recheck eligibility before every explicit presentation, without caching its response.
      const wallet = await getWallet(signal)
      if (signal.aborted) return Promise.reject(new Error('Presentation cancelled'))
      const eligibility = presentationEligibility(wallet, accessId, offerId)
      if (eligibility.blocked) throw new FinancialRestrictionError(FINANCIAL_RESTRICTION_MESSAGE)
      if (!eligibility.allowed) throw new Error('Benefit unavailable')
      // Read before the request leaves: the code cannot have been issued earlier.
      const requestedAt = Date.now()
      const result = await createPresentation(accessId, offerId, signal)
      if (!signal.aborted) void client.invalidateQueries({ queryKey: walletKeys.wallet })
      return { ...result, deadline: presentationDeadline(result, requestedAt) }
    }
  )
}
