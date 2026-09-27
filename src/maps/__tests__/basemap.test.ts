import { renderHook, waitFor } from '@testing-library/react-native'

import { regionalTextFont, textFontFromStyle, useBasemap } from '../basemap'

/** The attribution the published regional style actually declares. */
const declared =
  '<a href="https://protomaps.com">Protomaps</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'

/** The shape of the regional style's text layers, including a computed stack. */
const regional = {
  sources: { protomaps: { attribution: declared } },
  layers: [
    { id: 'background', paint: {} },
    { id: 'roads_labels_minor', layout: { 'text-font': ['Noto Sans Regular'] } },
    {
      id: 'places_region',
      layout: {
        'text-font': ['case', ['<=', ['get', 'min_zoom'], 5], ['literal', ['Noto Sans Medium']]],
      },
    },
    { id: 'water_label', layout: { 'text-font': ['Noto Sans Italic'] } },
    { id: 'places_country', layout: { 'text-font': ['Noto Sans Medium'] } },
  ],
}

describe('textFontFromStyle', () => {
  it('names a stack the style ships, preferring a medium weight', () => {
    expect(textFontFromStyle(regional)).toEqual(['Noto Sans Medium'])
  })

  // The demo fallback serves Open Sans only; Noto there would draw no text at all.
  it('follows a style built with another face', () => {
    expect(
      textFontFromStyle({ layers: [{ layout: { 'text-font': ['Open Sans Semibold'] } }] })
    ).toEqual(['Open Sans Semibold'])
    expect(
      textFontFromStyle({ layers: [{ layout: { 'text-font': ['Roboto Regular'] } }] })
    ).toEqual(['Roboto Regular'])
  })

  it('assumes the regional face when the style names none', () => {
    expect(textFontFromStyle({ layers: [{ layout: {} }] })).toEqual(regionalTextFont)
    expect(textFontFromStyle(null)).toEqual(regionalTextFont)
  })
})

describe('useBasemap', () => {
  afterEach(() => jest.restoreAllMocks())

  it('credits what the configured style declares and writes in its face', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => regional,
    } as Response)

    const { result } = await renderHook(() => useBasemap('https://example.invalid/style.json'))

    await waitFor(() =>
      expect(result.current).toEqual({
        credit: 'Protomaps © OpenStreetMap contributors',
        textFont: ['Noto Sans Medium'],
      })
    )
  })

  it('falls back to the baseline instead of crediting nobody', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))

    const { result } = await renderHook(() => useBasemap('https://example.invalid/style.json'))

    await waitFor(() =>
      expect(result.current).toEqual({ credit: '© OpenStreetMap', textFont: regionalTextFont })
    )
  })
})
