import { request } from './client'
import { publicRequest } from './public'
import type { components } from './schema'
import { readCredentials, SessionExpiredError } from './session'

type Schemas = components['schemas']

export type ConciergeQuestion = Schemas['ConciergeQuestion']
export type ConciergeReply = Schemas['ConciergeReply']
export type ConciergeOutcome = ConciergeReply['outcome']

/**
 * One catalogue reference backing a reply.
 *
 * `ref` is the whole citation identity, as `"<kind>:<id>"`. The numeric id
 * collided between establishments, experiences and events, which let grounding
 * validation accept a citation that pointed at another table's row. Navigation
 * uses the public identity pair, `city_slug` plus `establishment_slug`.
 */
export type ConciergeGroundingItem = Schemas['ConciergeGroundingItem']

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

/**
 * The same assistant for a signed-in Explorer, weighing their interests
 * (Anexo I item 11). The interests stay on the server: they choose which places
 * enter the prompt and are never sent to the model provider.
 *
 * A session that expired is not a reason to leave the person without an
 * answer: the question falls back to the public route, which is what a visitor
 * would get, and `personalized` then says honestly that interests were not used.
 */
export async function askMyConcierge(
  body: ConciergeQuestion,
  signal?: AbortSignal
): Promise<ConciergeReply> {
  try {
    return await request<ConciergeReply>('/api/v1/me/concierge', {
      method: 'POST',
      authenticated: true,
      body,
      signal,
      sensitive: true,
    })
  } catch (error) {
    if (error instanceof SessionExpiredError) return askConcierge(body, signal)
    throw error
  }
}

/**
 * What the discovery screen calls.
 *
 * The choice between the public and the personal route is made here, at the
 * moment of asking, from the stored credentials — not in the screen. Discovery
 * never reads the session (a visitor must get the full screen, and it must not
 * wait on a session that is still loading); the assistant just asks, and a
 * visitor with no credentials takes the public route.
 */
export async function askAssistant(
  body: ConciergeQuestion,
  signal?: AbortSignal
): Promise<ConciergeReply> {
  const credentials = await readCredentials()
  return credentials ? askMyConcierge(body, signal) : askConcierge(body, signal)
}
