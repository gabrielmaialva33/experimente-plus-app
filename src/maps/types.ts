import type { EstablishmentSummary } from '@/catalog/types'

export interface MapPin {
  slug: string
  name: string
  category: string | null
  latitude: number
  longitude: number
}

export interface MapRendererProps {
  pins: MapPin[]
  center: { latitude: number; longitude: number }
  onSelect: (slug: string) => void
}

/** Only establishments the projection actually located can be drawn. */
export const toPins = (establishments: EstablishmentSummary[]): MapPin[] =>
  establishments.flatMap((item) =>
    item.address.latitude != null && item.address.longitude != null
      ? [
          {
            slug: item.slug,
            name: item.name,
            category: item.primary_category?.name ?? null,
            latitude: item.address.latitude,
            longitude: item.address.longitude,
          },
        ]
      : []
  )

/** Places this close share one marker: the same building, the same shopping mall. */
export const SAME_SPOT_METRES = 25

export interface MapPinGroup {
  key: string
  latitude: number
  longitude: number
  pins: MapPin[]
}

const metresBetween = (a: MapPin, b: MapPin) => {
  const rad = Math.PI / 180
  const dLat = (b.latitude - a.latitude) * rad
  const dLng = (b.longitude - a.longitude) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

/**
 * Markers drawn at the same point stack, and the tap lands on whichever the
 * map hit-tests first, not the one on top: a person tapping one place opened
 * the other. Places within a few metres become one marker that lists them, so
 * every tap names what it opens. The first place of a group anchors it, and
 * order follows the list the server returned.
 */
export const groupPins = (pins: MapPin[]): MapPinGroup[] => {
  const groups: MapPinGroup[] = []
  for (const pin of pins) {
    const group = groups.find((candidate) => metresBetween(candidate.pins[0], pin) <= SAME_SPOT_METRES)
    if (group) group.pins.push(pin)
    else groups.push({ key: pin.slug, latitude: pin.latitude, longitude: pin.longitude, pins: [pin] })
  }
  return groups
}

/** What a marker says out loud and on its label. */
export const groupLabel = (group: MapPinGroup) =>
  group.pins.length === 1 ? group.pins[0].name : `${group.pins.length} lugares aqui`
