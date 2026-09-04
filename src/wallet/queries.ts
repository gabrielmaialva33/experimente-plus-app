import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createPresentation, getWallet } from '@/api/wallet'

export const walletKeys = {
  wallet: ['wallet'] as const,
}

export const useWallet = () => useQuery({ queryKey: walletKeys.wallet, queryFn: getWallet })

/**
 * Creating a presentation is never retried automatically: it consumes server
 * state and the retry contract requires human intent.
 */
export function useCreatePresentation() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ accessId, offerId }: { accessId: number; offerId: number }) =>
      createPresentation(accessId, offerId),
    onSuccess: () => client.invalidateQueries({ queryKey: walletKeys.wallet }),
  })
}
