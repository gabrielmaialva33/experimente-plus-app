import { useQuery } from '@tanstack/react-query'

import {
  listPublishedPartnerContent,
  type PartnerContentKind,
} from '@/api/partner-content'

export const partnerContentKeys = {
  establishment: (establishmentId: number, kind: PartnerContentKind) =>
    ['catalog', 'partner-content', establishmentId, kind] as const,
}

export function usePartnerContent(establishmentId: number, kind: PartnerContentKind) {
  return useQuery({
    queryKey: partnerContentKeys.establishment(establishmentId, kind),
    queryFn: () => listPublishedPartnerContent(establishmentId, kind),
    enabled: establishmentId > 0,
  })
}
