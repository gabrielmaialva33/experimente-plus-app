import type { Presentation } from './types'

/**
 * When a presentation stops being valid, in milliseconds on this device's clock.
 *
 * The server's `expires_at` is the deadline. A device clock running behind the
 * server's reads it as later than it is and would keep showing a code the
 * partner can no longer validate, so it is capped by `expires_in_seconds`
 * counted from before the request left: the server issued the code after that
 * moment, so the cap is never later than the real end. A clock running ahead
 * only shortens what is shown. Either way the deadline never passes the
 * server's (ADR-0021); an unreadable `expires_at` counts as already expired.
 */
export function presentationDeadline(
  presentation: Pick<Presentation, 'expires_at' | 'expires_in_seconds'>,
  requestedAt: number
): number {
  const expiresAt = Date.parse(presentation.expires_at)
  if (!Number.isFinite(expiresAt)) return requestedAt
  const seconds = presentation.expires_in_seconds
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0
    ? Math.min(expiresAt, requestedAt + seconds * 1000)
    : expiresAt
}

/** Whole seconds left until `deadline`, rounded down and never negative. */
export const secondsLeft = (deadline: number, now: number) =>
  Math.max(0, Math.floor((deadline - now) / 1000))

/** "4:05": what the countdown shows. */
export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/**
 * "4 minutos e 5 segundos": what a screen reader says instead of "4:05",
 * which it could read as a time of day.
 */
export function spokenClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  const parts = [
    minutes > 0 ? `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}` : null,
    rest > 0 || minutes === 0 ? `${rest} ${rest === 1 ? 'segundo' : 'segundos'}` : null,
  ]
  return parts.filter(Boolean).join(' e ')
}
