import { publicRequest } from './public'
import type { components } from './schema'

type Schemas = components['schemas']

export type PartnerContentPublicMedia = Schemas['PartnerContentPublicMedia']

/** Collection segment of the public route: plural and kebab-case. */
export type PartnerContentKind = 'experiences' | 'events' | 'showcase-items'

/** Kind as the payload declares it: singular and snake_case. */
export type PartnerContentItemKind = 'experience' | 'event' | 'showcase_item'

/**
 * Public partner-owned content (ADR-0028).
 *
 * The operation is resolved from the API hostname. The payload carries only what
 * publication already resolved on the server: approved text, the event window,
 * the informational price and approved media. Choosing between the live row and
 * the approved snapshot is a publication rule and stays in the backend, so
 * neither `published_snapshot` nor a live column reaches this client — a public
 * response that still carried them made the leak a client mistake away.
 *
 * Canonical schemas pending `pnpm api:types`:
 * `components['schemas']['PartnerContentPublicItem']` and
 * `components['schemas']['PartnerContentPublicListResponse']`.
 */
export interface PartnerContentPublicItem {
  id: number
  kind: PartnerContentItemKind
  title: string
  description: string | null
  /** Events only, ISO 8601 UTC. */
  starts_at: string | null
  ends_at: string | null
  /** Showcase items only. Displayed, never charged. */
  informational_price_cents: number | null
  published_at: string
  /** Approved media only. */
  media: PartnerContentPublicMedia[]
}

export interface PartnerContentPublicListResponse {
  data: PartnerContentPublicItem[]
}

export async function listPublishedPartnerContent(
  establishmentId: number,
  kind: PartnerContentKind
): Promise<PartnerContentPublicItem[]> {
  const response = await publicRequest<PartnerContentPublicListResponse>(
    `/api/v1/catalog/establishments/${establishmentId}/${kind}`
  )
  return response.data ?? []
}
