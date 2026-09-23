import { publicRequest } from './public'
import type { operations } from './schema'

type AskCatalogConcierge = operations['askCatalogConcierge']

export type ConciergeQuestion =
  AskCatalogConcierge['requestBody']['content']['application/json']

export type ConciergeOutcome = 'grounded' | 'degraded' | 'refused'

/**
 * One catalogue reference backing a reply.
 *
 * `ref` is the whole citation identity, as `"<kind>:<id>"`. The numeric id
 * collided between establishments, experiences and events, which let grounding
 * validation accept a citation that pointed at another table's row. Navigation
 * uses the public identity pair, `city_slug` plus `establishment_slug`.
 *
 * Canonical schema pending `pnpm api:types`:
 * `components['schemas']['ConciergeGroundingItem']`, together with the
 * `askCatalogConcierge` 200 payload that carries it.
 */
export interface ConciergeGroundingItem {
  ref: string
  kind: 'establishment' | 'experience' | 'event'
  name: string
  city_slug: string
  establishment_slug: string
  establishment_name: string
  district: string | null
  category: string | null
  starts_at: string | null
  ends_at: string | null
}

export interface ConciergeReply {
  outcome: ConciergeOutcome
  /** Absent on a degraded reply, which carries references only. */
  text: string | null
  /** Catalogue references backing the reply, in the server's order. */
  items: ConciergeGroundingItem[]
  /** Null when no model was consulted. */
  model: string | null
}

/**
 * Public, read-only discovery assistant (ADR-0029).
 *
 * The question is marked sensitive for no-store semantics. This public
 * transport has no session dependency and can never attach credentials.
 */
export const askConcierge = (body: ConciergeQuestion, signal?: AbortSignal) =>
  publicRequest<ConciergeReply>('/api/v1/catalog/concierge', {
    method: 'POST',
    body,
    signal,
    sensitive: true,
  })
