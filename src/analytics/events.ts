import { randomUUID } from 'expo-crypto'

import { apiUrl } from '@/api/config'

/**
 * Discovery analytics.
 *
 * This is the instrumentation behind the product's North Star — qualified
 * discovery actions per month (`docs/product/03-mvp-e-roadmap.md`). It has to
 * exist from the first screen, because the history cannot be reconstructed
 * later.
 *
 * The endpoint is public and pseudonymous: the server resolves the session and
 * honours `DNT`/`Sec-GPC`. The client sends no identifier of its own.
 */
export type AnalyticsEventType =
  | 'catalog_impression'
  | 'establishment_view'
  | 'route_click'
  | 'whatsapp_click'
  | 'phone_click'
  | 'website_click'
  | 'share_click'
  | 'search_without_results'

interface AnalyticsEvent {
  event_id: string
  event_type: AnalyticsEventType
  city_slug: string
  establishment_slug?: string
  category_slug?: string
  search_term?: string
}

const MAX_BATCH = 20
/** The server rejects the whole batch when one term exceeds this. */
const MAX_SEARCH_TERM = 120
const FLUSH_DELAY = 2000

let queue: AnalyticsEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null

async function post(events: AnalyticsEvent[]): Promise<void> {
  try {
    await fetch(apiUrl('/api/v1/analytics/events'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept': 'application/json' },
      body: JSON.stringify({ events }),
    })
  } catch {
    // Measurement must never break discovery. A dropped batch is acceptable;
    // a crashed screen is not.
  }
}

export async function flushEvents(): Promise<void> {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }

  const pending = queue
  queue = []

  if (pending.length > 0) {
    await post(pending)
  }
}

/** Queues an event. Batched so a scroll does not become a request per card. */
export function track(
  eventType: AnalyticsEventType,
  payload: Omit<AnalyticsEvent, 'event_id' | 'event_type'>
): void {
  queue.push({
    event_id: randomUUID(),
    event_type: eventType,
    ...payload,
    ...(payload.search_term
      ? { search_term: payload.search_term.slice(0, MAX_SEARCH_TERM) }
      : {}),
  })

  if (queue.length >= MAX_BATCH) {
    void flushEvents()
    return
  }

  timer ??= setTimeout(() => void flushEvents(), FLUSH_DELAY)
}
