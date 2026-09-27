import { useEffect, useState } from 'react'

import { baselineCredit, creditFromStyle } from './attribution'
import { mapStyleUrl } from './config'

/**
 * What the app draws over the basemap and has to take from its style: the
 * credit the style declares, and a font its glyph server actually has.
 */
export interface Basemap {
  credit: string
  textFont: string[]
}

/**
 * The regional style's own face. Until the style is read, labels assume it,
 * since it is the one every configured build points at.
 */
export const regionalTextFont = ['Noto Sans Medium']

const isFontStack = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every((font) => typeof font === 'string')

/**
 * A font stack the style already uses, preferring a medium weight for names
 * read over a busy map.
 *
 * A style's glyphs are served per font stack, and only for the stacks it was
 * built with: naming any other one makes MapLibre draw no text at all — no
 * place names and no counts on the clusters. The demo fallback ships Open Sans,
 * the regional basemap Noto Sans, so the stack is read from the style instead of
 * being fixed here.
 */
export function textFontFromStyle(style: unknown): string[] {
  const layers = (style as { layers?: { layout?: Record<string, unknown> }[] })?.layers
  const stacks = (Array.isArray(layers) ? layers : [])
    .map((layer) => layer?.layout?.['text-font'])
    .filter(isFontStack)
  const weighing = (pattern: RegExp) => stacks.find((stack) => stack.some((f) => pattern.test(f)))

  return (
    weighing(/medium/i) ??
    weighing(/semi ?bold/i) ??
    weighing(/bold/i) ??
    stacks[0] ??
    regionalTextFont
  )
}

/**
 * Reads the configured style once. A credit that vanishes when the network does
 * would be worse than a conservative one, so failure keeps the baseline instead
 * of nothing, and the regional font.
 */
export function useBasemap(styleUrl: string = mapStyleUrl): Basemap {
  const [basemap, setBasemap] = useState<Basemap>({
    credit: baselineCredit,
    textFont: regionalTextFont,
  })

  useEffect(() => {
    const controller = new AbortController()
    const apply = (value: Basemap) => {
      if (!controller.signal.aborted) setBasemap(value)
    }

    fetch(styleUrl, { signal: controller.signal })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error(String(response.status)))
      )
      .then((style) =>
        apply({ credit: creditFromStyle(style), textFont: textFontFromStyle(style) })
      )
      .catch(() => apply({ credit: baselineCredit, textFont: regionalTextFont }))

    return () => controller.abort()
  }, [styleUrl])

  return basemap
}
