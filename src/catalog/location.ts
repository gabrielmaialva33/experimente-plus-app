import * as Location from 'expo-location'

import type { Origin } from '@/api/catalog'

/**
 * The device's position for "Mais perto", asked only when the person picks that
 * order and only in the foreground.
 *
 * Nothing here stores the answer: it goes back to the caller, which sends it
 * with that search and keeps it in memory while the order stays chosen.
 */
export type LocationOutcome =
  | { status: 'granted'; origin: Origin }
  /** Refused, and the system will ask again next time. */
  | { status: 'denied' }
  /** Refused for good: only the system settings can change it. */
  | { status: 'blocked' }
  /** The device's location is switched off. */
  | { status: 'off' }
  /** Allowed, but no position came back in time. */
  | { status: 'unavailable' }

export type LocationProblem = Exclude<LocationOutcome['status'], 'granted'>

/** A position from the last few minutes orders a list as well as a new one. */
const RECENT_ENOUGH_MS = 5 * 60_000

/**
 * Four decimal places is about eleven metres: closer than any order between two
 * places needs, and less than the device knows.
 */
const rounded = (value: number) => Math.round(value * 10_000) / 10_000

async function permission(): Promise<'granted' | 'denied' | 'blocked'> {
  const current = await Location.getForegroundPermissionsAsync()
  if (current.granted) return 'granted'
  if (!current.canAskAgain) return 'blocked'

  const answer = await Location.requestForegroundPermissionsAsync()
  if (answer.granted) return 'granted'
  return answer.canAskAgain ? 'denied' : 'blocked'
}

export async function locateForNearest(): Promise<LocationOutcome> {
  try {
    const allowed = await permission()
    if (allowed !== 'granted') return { status: allowed }
    if (!(await Location.hasServicesEnabledAsync())) return { status: 'off' }

    const position =
      (await Location.getLastKnownPositionAsync({ maxAge: RECENT_ENOUGH_MS })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }))

    return {
      status: 'granted',
      origin: {
        latitude: rounded(position.coords.latitude),
        longitude: rounded(position.coords.longitude),
      },
    }
  } catch {
    return { status: 'unavailable' }
  }
}
