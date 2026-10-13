import type { Origin } from '@/api/catalog'

/** The Earth's mean radius, in kilometres. */
const EARTH_RADIUS_KM = 6371.0088

const radians = (degrees: number) => (degrees * Math.PI) / 180

/** Kilometres between two points over the Earth's surface (haversine). */
export function distanceKm(from: Origin, to: Origin): number {
  const latitude = radians(to.latitude - from.latitude)
  const longitude = radians(to.longitude - from.longitude)
  const a =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitude / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * "a 1,2 km", "a 350 m" or "a 298 km", as distances are read in Brazil; nothing
 * without one. Metres go in steps of 50, kilometres to one decimal and, from
 * ten on, whole: closer than that says more than a phone's position knows, and
 * "a 298,8 km" read as a precision nobody needs. The itinerary's suggestions
 * come from the server in tenths of a kilometre, and read the same here.
 */
export function distanceLabel(distanceKm: number | null): string | null {
  if (distanceKm === null || !Number.isFinite(distanceKm) || distanceKm < 0) return null
  if (distanceKm < 0.1) return 'a menos de 100 m'
  const metres = Math.round(distanceKm * 20) * 50
  if (metres < 1000) return `a ${metres} m`
  const km = Math.round(distanceKm * 10) / 10
  if (km >= 10) return `a ${Math.round(distanceKm)} km`
  return `a ${Number.isInteger(km) ? km : km.toFixed(1).replace('.', ',')} km`
}

/**
 * How far a place is from the position of a nearest-first search, worked out
 * here from the coordinates the place already carries; null without both
 * points. The position never leaves memory for this: nothing is sent, stored
 * or counted.
 */
export function placeDistance(
  origin: Origin | null,
  place: { latitude?: number | null; longitude?: number | null }
): string | null {
  if (!origin || place.latitude == null || place.longitude == null) return null
  return distanceLabel(distanceKm(origin, { latitude: place.latitude, longitude: place.longitude }))
}
