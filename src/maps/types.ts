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
  /** A place picked on the map itself: the map holds it and says which it is. */
  onSelect: (slug: string) => void
  /** A place chosen from a list of several at one spot: straight to its page. */
  onOpen: (slug: string) => void
  /** The place held by the map, drawn larger and named ahead of the others. */
  selected?: string | null
  /** A tap on the map away from any mark. */
  onBackgroundPress?: () => void
  /** Explorar's list of the same places: the way through for a screen reader. */
  onShowList?: () => void
  /** How much of the map's foot a card covers, in dp: the held place is kept above it. */
  coveredBottom?: number
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
    const group = groups.find(
      (candidate) => metresBetween(candidate.pins[0], pin) <= SAME_SPOT_METRES
    )
    if (group) group.pins.push(pin)
    else
      groups.push({ key: pin.slug, latitude: pin.latitude, longitude: pin.longitude, pins: [pin] })
  }
  return groups
}

/** What a marker says out loud and on its label. */
export const groupLabel = (group: MapPinGroup) =>
  group.pins.length === 1 ? group.pins[0].name : `${group.pins.length} lugares aqui`

/** What each mark drawn by the map's own layers carries. */
export type PlaceProperties = {
  /** The group's key: the slug of its first place. */
  key: string
  /** What a lone place writes beside its dot. */
  name: string
  /** How many places the mark stands for; a cluster adds up its members'. */
  places: number
  /** The server's order: when labels crowd, the first results keep theirs. */
  rank: number
}

export type PlaceFeature = {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [longitude: number, latitude: number] }
  properties: PlaceProperties
}

/** One point per group, for a map that clusters and labels on its own. */
export const placeFeatures = (groups: MapPinGroup[]) => ({
  type: 'FeatureCollection' as const,
  features: groups.map((group, rank): PlaceFeature => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [group.longitude, group.latitude] },
    properties: { key: group.key, name: groupLabel(group), places: group.pins.length, rank },
  })),
})

/** A feature as the map hands it back from a press. */
export interface PressedFeature {
  geometry?: { type?: string; coordinates?: unknown } | null
  properties?: Record<string, unknown> | null
}

/** What a press on the map's marks asks for. */
export type MapTarget =
  | { kind: 'place'; slug: string }
  | { kind: 'spot'; group: MapPinGroup }
  | { kind: 'cluster'; clusterId: number; center: [longitude: number, latitude: number] }

const pointOf = (feature: PressedFeature): [number, number] | null => {
  const coordinates = feature.geometry?.coordinates
  return feature.geometry?.type === 'Point' &&
    Array.isArray(coordinates) &&
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number'
    ? [coordinates[0], coordinates[1]]
    : null
}

/**
 * The mark a press meant.
 *
 * A press reaches every mark within a finger's width, and a label reaches
 * further than its dot, so two marks can answer one tap. The one whose point is
 * closest to the finger is the one meant. A cluster asks to be opened; a place
 * opens; a spot with several places lists them.
 */
export function pressedTarget(
  features: PressedFeature[],
  [longitude, latitude]: [number, number],
  groups: MapPinGroup[]
): MapTarget | null {
  // Degrees of longitude shrink away from the equator; this keeps the comparison square.
  const squeeze = Math.cos((latitude * Math.PI) / 180)
  let best: { target: MapTarget; distance: number } | null = null

  for (const feature of features) {
    const point = pointOf(feature)
    const properties = feature.properties ?? {}
    if (!point) continue

    let target: MapTarget | null = null
    if (properties.cluster === true && typeof properties.cluster_id === 'number') {
      target = { kind: 'cluster', clusterId: properties.cluster_id, center: point }
    } else {
      const group = groups.find((candidate) => candidate.key === properties.key)
      if (group)
        target =
          group.pins.length === 1
            ? { kind: 'place', slug: group.pins[0].slug }
            : { kind: 'spot', group }
    }
    if (!target) continue

    const distance = ((point[0] - longitude) * squeeze) ** 2 + (point[1] - latitude) ** 2
    if (!best || distance < best.distance) best = { target, distance }
  }

  return best?.target ?? null
}

/**
 * The places behind a cluster that cannot be split any further, as one spot
 * the list can show. Leaves arrive as features that name their group.
 */
export function spotOfLeaves(
  leaves: PressedFeature[],
  center: [longitude: number, latitude: number],
  groups: MapPinGroup[]
): MapPinGroup | null {
  const keys = new Set(leaves.map((leaf) => leaf.properties?.key))
  const members = groups.filter((group) => keys.has(group.key))
  if (members.length === 0) return null
  return {
    key: members.map((group) => group.key).join('+'),
    longitude: center[0],
    latitude: center[1],
    pins: members.flatMap((group) => group.pins),
  }
}

/** Room kept between a held mark and the card under it: the mark, its name and some air. */
export const MARK_CLEARANCE = 40

/**
 * How far the camera moves down the view, in dp, for a held mark at `markY` to
 * clear a card covering `covered` of a view `viewHeight` tall: none when it
 * already does; otherwise the mark rises to the middle of what the card leaves.
 * On a small phone or a tablet in landscape the map is short, and the card
 * opened over the very place it names.
 */
export function liftAboveCard(markY: number, viewHeight: number, covered: number): number {
  const visible = viewHeight - covered
  if (covered <= 0 || visible <= 0 || markY <= visible - MARK_CLEARANCE) return 0
  return markY - visible / 2
}
