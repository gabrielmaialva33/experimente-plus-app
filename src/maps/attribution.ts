import { useEffect, useState } from 'react'

import { mapStyleUrl } from './config'

/**
 * The basemap credit is read from the style, never hardcoded.
 *
 * Crediting the basemap producer is a licence obligation, and MapLibre's own
 * attribution dialog shows only part of what the style declares — on Android it
 * drops the producer and keeps OpenStreetMap. Naming a producer in the app
 * instead would be false whenever `EXPO_PUBLIC_MAP_STYLE_URL` points somewhere
 * else: the demo fallback carries OpenStreetMap data without one. The style's
 * own `attribution` is the only value that cannot go stale, so it is read at
 * runtime and rendered by us.
 */

/** Every basemap this app can point at derives from OpenStreetMap. */
const baseline = '© OpenStreetMap'

/** The style declares attribution as HTML; the map draws plain text. */
export function creditFromAttribution(attribution: string): string {
  return attribution
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

export function creditFromStyle(style: unknown): string {
  const sources = (style as { sources?: Record<string, { attribution?: unknown } | null> })?.sources
  const credits = Object.values(sources ?? {})
    .map((source) =>
      typeof source?.attribution === 'string' ? creditFromAttribution(source.attribution) : ''
    )
    .filter(Boolean)

  // Two sources of the same basemap repeat one credit; show it once.
  return [...new Set(credits)].join(' · ') || baseline
}

/**
 * A credit that vanishes when the network does would be worse than a
 * conservative one, so failure falls back to the baseline instead of nothing.
 */
export function useMapCredit(styleUrl: string = mapStyleUrl): string {
  const [credit, setCredit] = useState(baseline)

  useEffect(() => {
    const controller = new AbortController()
    const apply = (value: string) => {
      if (!controller.signal.aborted) setCredit(value)
    }

    fetch(styleUrl, { signal: controller.signal })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error(String(response.status)))
      )
      .then((style) => apply(creditFromStyle(style)))
      .catch(() => apply(baseline))

    return () => controller.abort()
  }, [styleUrl])

  return credit
}
