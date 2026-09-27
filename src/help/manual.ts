import * as WebBrowser from 'expo-web-browser'
import { Linking } from 'react-native'

import { apiUrl } from '@/api/config'
import { palette } from '@/theme/tokens'

/**
 * The sections of the app chapter in the user manual, by the anchor the web
 * page gives each one.
 *
 * The anchors are a contract with the manual served at `/manual`, on the same
 * origin as the API: the web side keeps these ids, and a new or renamed one is
 * changed on both sides together. The test fixes every string.
 */
export const MANUAL_ANCHORS = {
  install: 'app-instalar',
  explore: 'app-explorar',
  map: 'app-mapa',
  place: 'app-lugar',
  news: 'app-novidades',
  concierge: 'app-concierge',
  account: 'app-conta',
  favorites: 'app-favoritos',
  purchase: 'app-comprar',
  wallet: 'app-carteira',
  review: 'app-avaliar',
  validate: 'app-validar',
  troubleshooting: 'app-problemas',
} as const satisfies Record<string, `app-${string}`>

export type HelpTopic = keyof typeof MANUAL_ANCHORS

/** The manual, at the section about `topic`; the whole manual without one. */
export function manualUrl(topic?: HelpTopic): string {
  const page = apiUrl('/manual')
  return topic ? `${page}#${MANUAL_ANCHORS[topic]}` : page
}

/**
 * What a help control says to a screen reader: where it leads, then its own
 * words, so the visible label stays part of the name ("Como validar" becomes
 * "Abrir o manual: como validar").
 */
export function manualLabel(label: string): string {
  return `Abrir o manual: ${label.charAt(0).toLocaleLowerCase('pt-BR')}${label.slice(1)}`
}

// The brand's navy, as the header band draws it: the browser reads as part of the app.
const BROWSER_OPTIONS: WebBrowser.WebBrowserOpenOptions = {
  toolbarColor: palette.light.chrome,
  controlsColor: palette.light.chromeForeground,
  secondaryToolbarColor: palette.light.chrome,
  showTitle: true,
  dismissButtonStyle: 'close',
}

let opening: Promise<void> | null = null

/**
 * Opens the manual in the in-app browser (Custom Tabs, SFSafariViewController),
 * or in the system browser when no in-app browser can take it.
 *
 * Nothing is announced: the browser coming up is its own answer. A second tap
 * while the first is still opening reuses it instead of stacking two browsers.
 * On iOS the promise settles when the browser closes, which is what keeps an
 * options sheet mounted underneath until then (see `ActionMenu`).
 */
export function openManual(topic?: HelpTopic): Promise<void> {
  if (opening) return opening
  const url = manualUrl(topic)
  opening = (async () => {
    try {
      await WebBrowser.openBrowserAsync(url, BROWSER_OPTIONS)
    } catch {
      try {
        await Linking.openURL(url)
      } catch {
        // No browser at all: nothing on the device can show a web page.
      }
    } finally {
      opening = null
    }
  })()
  return opening
}
