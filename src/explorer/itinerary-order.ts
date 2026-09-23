/**
 * Moves one stop and returns the whole new sequence.
 *
 * The server takes the full order, never "this stop to there", so the client
 * computes the complete list here and sends it. Out-of-range moves return the
 * sequence unchanged rather than wrapping around: a stop pressed "up" at the
 * top of a route should stay at the top, not jump to the end.
 */
export function moveStop(stopIds: number[], index: number, delta: -1 | 1): number[] {
  const target = index + delta
  if (index < 0 || index >= stopIds.length || target < 0 || target >= stopIds.length) {
    return stopIds
  }

  const next = [...stopIds]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  return next
}
