/**
 * Which renderer draws the map.
 *
 * Google Maps needs a per-platform API key; MapLibre does not. The key's
 * presence is therefore the switch: configured, the app uses the renderer whose
 * labels and POIs people recognise; absent, it falls back to MapLibre, which
 * works in development and on any build without a credential.
 *
 * Shipping both costs binary size and a second implementation to maintain. That
 * is a deliberate, revisitable trade — see the note in the README.
 */
export const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || null

export const usesGoogleMaps = googleMapsKey !== null

/**
 * MapLibre needs a style. The demo tiles are documented as development-only;
 * production should point at an own style — a Protomaps archive on the
 * operation's own storage needs no key either.
 */
export const mapStyleUrl =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL?.trim() || 'https://demotiles.maplibre.org/style.json'
