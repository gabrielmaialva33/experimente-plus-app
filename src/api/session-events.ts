export type SessionEvent = 'expired' | 'context-invalidated' | 'operation-changing' | 'operation-settled'

const listeners = new Set<(event: SessionEvent) => void>()

/** Events carry no credentials, response bodies or presentation content. */
export function subscribeSessionEvents(listener: (event: SessionEvent) => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function notifySessionEvent(event: SessionEvent): void {
  for (const listener of listeners) listener(event)
}
