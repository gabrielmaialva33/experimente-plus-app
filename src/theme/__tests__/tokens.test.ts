import { navigationColors, stackSurfaceOptions } from '../navigation'
import { elevation, palette, radius } from '../tokens'

// Exact canonical CSS OKLCH, 2026-09-08. Portable without the sibling checkout.
const canonicalOklch = {
  light: {
    surfaceBase: 'oklch(0.969195527 0.003425761 247.858256445)',
    surfaceRaised: 'oklch(1 0 0)',
    surfaceOverlay: 'oklch(1 0 0)',
    surfaceContext: 'oklch(0.969195527 0.003425761 247.858256445)',
    contextForeground: 'oklch(0.25 0.012 255)',
    background: 'oklch(0.969195527 0.003425761 247.858256445)',
    foreground: 'oklch(0.25 0.012 255)',
    card: 'oklch(1 0 0)',
    cardForeground: 'oklch(0.25 0.012 255)',
    popover: 'oklch(1 0 0)',
    popoverForeground: 'oklch(0.25 0.012 255)',
    primary: 'oklch(0.391842381 0.105523416 253.364477316)',
    primaryHover: 'oklch(0.34 0.092 253.364477316)',
    primaryForeground: 'oklch(1 0 0)',
    primarySoft: 'oklch(0.958 0.019 253.364477316)',
    primaryAccent: 'oklch(0.391842381 0.105523416 253.364477316)',
    secondary: 'oklch(1 0 0)',
    secondaryForeground: 'oklch(0.25 0.012 255)',
    muted: 'oklch(0.941476798 0.007996977 253.85459596)',
    mutedForeground: 'oklch(0.46 0.015 255)',
    accent: 'oklch(0.958 0.019 253.364477316)',
    accentForeground: 'oklch(0.391842381 0.105523416 253.364477316)',
    cta: 'oklch(0.652931129 0.173621111 46.045497295)',
    ctaHover: 'oklch(0.7 0.155 46.045497295)',
    ctaForeground: 'oklch(0.22 0.028 46.045497295)',
    ctaSoft: 'oklch(0.95 0.025 46.045497295)',
    ctaAccent: 'oklch(0.45 0.105 46.045497295)',
    destructive: 'oklch(0.51 0.18 28)',
    destructiveHover: 'oklch(0.45 0.16 28)',
    destructiveForeground: 'oklch(1 0 0)',
    destructiveSoft: 'oklch(0.96 0.018 28)',
    destructiveAccent: 'oklch(0.44 0.15 28)',
    border: 'oklch(0.84 0.008 255)',
    input: 'oklch(0.57 0.012 255)',
    ring: 'oklch(0.45 0.12 253.364477316)',
    scrim: 'oklch(0.133386 0.015892 273.521)',
    success: 'oklch(0.49 0.115 155)',
    successForeground: 'oklch(1 0 0)',
    successSoft: 'oklch(0.956 0.027 155)',
    successAccent: 'oklch(0.43 0.1 155)',
    warning: 'oklch(0.79 0.14 80)',
    warningForeground: 'oklch(0.29 0.05 65)',
    warningSoft: 'oklch(0.96 0.035 85)',
    warningAccent: 'oklch(0.43 0.075 65)',
    info: 'oklch(0.48 0.085 230)',
    infoForeground: 'oklch(1 0 0)',
    infoSoft: 'oklch(0.957 0.022 230)',
    infoAccent: 'oklch(0.43 0.075 230)',
    chart1: 'oklch(0.482999 0.136144 253.911)',
    chart2: 'oklch(0.643847 0.197989 40.1886)',
    chart3: 'oklch(0.600557 0.115234 230.003)',
    chart4: 'oklch(0.603664 0.11314 164.187)',
    chart5: 'oklch(0.542357 0.187441 298.325)',
    contentAbsent: 'oklch(0.875 0.006 255)',
    contentAbsentForeground: 'oklch(0.43 0.02 255)',
    contentAbsentBorder: 'oklch(0.55 0.02 255)',
    temporalEmphasis: 'oklch(0.988 0.004 255)',
    temporalEmphasisForeground: 'oklch(0.34 0.015 255)',
    temporalEmphasisBorder: 'oklch(0.55 0.025 255)',
    choiceBorder: 'oklch(0.6 0.045 253.364477316)',
    statusNeutral: 'oklch(0.941476798 0.007996977 253.85459596)',
    statusNeutralForeground: 'oklch(0.46 0.015 255)',
    statusNeutralBorder: 'oklch(0.84 0.008 255)',
    choiceBackground: 'oklch(1 0 0)',
    choiceForeground: 'oklch(0.25 0.012 255)',
    choiceSelected: 'oklch(0.958 0.019 253.364477316)',
    choiceSelectedForeground: 'oklch(0.391842381 0.105523416 253.364477316)',
    choiceSelectedBorder: 'oklch(0.391842381 0.105523416 253.364477316)',
    actionSecondary: 'oklch(0.969195527 0.003425761 247.858256445)',
    actionSecondaryForeground: 'oklch(0.25 0.012 255)',
    actionSecondaryBorder: 'oklch(0.57 0.012 255)',
  },
  dark: {
    surfaceBase: 'oklch(0.190579 0.018873 275.681)',
    surfaceRaised: 'oklch(0.254256 0.036457 274.849)',
    surfaceOverlay: 'oklch(0.311724 0.056823 274.068)',
    surfaceContext: 'oklch(0.190579 0.018873 275.681)',
    contextForeground: 'oklch(0.972339 0.004673 84.5636)',
    background: 'oklch(0.190579 0.018873 275.681)',
    foreground: 'oklch(0.972339 0.004673 84.5636)',
    card: 'oklch(0.254256 0.036457 274.849)',
    cardForeground: 'oklch(0.972339 0.004673 84.5636)',
    popover: 'oklch(0.311724 0.056823 274.068)',
    popoverForeground: 'oklch(0.972339 0.004673 84.5636)',
    primary: 'oklch(0.743392 0.110862 251.054)',
    primaryHover: 'oklch(0.81028 0.080506 250.516)',
    primaryForeground: 'oklch(0.191511 0.034882 274.072)',
    primarySoft: 'oklch(0.331538 0.04734 250.976)',
    primaryAccent: 'oklch(0.825784 0.081948 250.514)',
    secondary: 'oklch(0.254256 0.036457 274.849)',
    secondaryForeground: 'oklch(0.972339 0.004673 84.5636)',
    muted: 'oklch(0.254256 0.036457 274.849)',
    mutedForeground: 'oklch(0.828324 0.024104 84.5932)',
    accent: 'oklch(0.331538 0.04734 250.976)',
    accentForeground: 'oklch(0.825784 0.081948 250.514)',
    cta: 'oklch(0.747823 0.15366 48.8186)',
    ctaHover: 'oklch(0.836053 0.093504 58.4456)',
    ctaForeground: 'oklch(0.221969 0.038615 49.8432)',
    ctaSoft: 'oklch(0.331312 0.049114 53.907)',
    ctaAccent: 'oklch(0.836053 0.093504 58.4456)',
    destructive: 'oklch(0.690037 0.157955 22.0757)',
    destructiveHover: 'oklch(0.759377 0.1158 20.1165)',
    destructiveForeground: 'oklch(0.200316 0.034587 20.5948)',
    destructiveSoft: 'oklch(0.315933 0.059434 20.9791)',
    destructiveAccent: 'oklch(0.812146 0.095733 19.3507)',
    border: 'oklch(0.410811 0.063788 274.616)',
    input: 'oklch(0.681873 0.045602 276.24)',
    ring: 'oklch(0.743392 0.110862 251.054)',
    scrim: 'oklch(0.133386 0.015892 273.521)',
    success: 'oklch(0.784753 0.160935 154.357)',
    successForeground: 'oklch(0.190579 0.018873 275.681)',
    successSoft: 'oklch(0.350415 0.048455 157.136)',
    successAccent: 'oklch(0.871761 0.101829 157.856)',
    warning: 'oklch(0.823357 0.138274 78.2444)',
    warningForeground: 'oklch(0.265459 0.05917 57.8617)',
    warningSoft: 'oklch(0.347772 0.040173 80.4926)',
    warningAccent: 'oklch(0.894623 0.092856 84.1027)',
    info: 'oklch(0.802723 0.106996 224.388)',
    infoForeground: 'oklch(0.190579 0.018873 275.681)',
    infoSoft: 'oklch(0.338604 0.038788 223.55)',
    infoAccent: 'oklch(0.871998 0.070834 222.52)',
    chart1: 'oklch(0.679133 0.140663 251.962)',
    chart2: 'oklch(0.725074 0.169254 47.5318)',
    chart3: 'oklch(0.75134 0.129544 227.307)',
    chart4: 'oklch(0.755915 0.142212 164.125)',
    chart5: 'oklch(0.65502 0.168272 300.277)',
    contentAbsent: 'oklch(0.22 0.006 255)',
    contentAbsentForeground: 'oklch(0.83 0.015 255)',
    contentAbsentBorder: 'oklch(0.46 0.018 255)',
    temporalEmphasis: 'oklch(0.36 0.015 255)',
    temporalEmphasisForeground: 'oklch(0.9 0.015 255)',
    temporalEmphasisBorder: 'oklch(0.7 0.025 255)',
    choiceBorder: 'oklch(0.7 0.045 253.59)',
    statusNeutral: 'oklch(0.254256 0.036457 274.849)',
    statusNeutralForeground: 'oklch(0.828324 0.024104 84.5932)',
    statusNeutralBorder: 'oklch(0.410811 0.063788 274.616)',
    choiceBackground: 'oklch(0.254256 0.036457 274.849)',
    choiceForeground: 'oklch(0.972339 0.004673 84.5636)',
    choiceSelected: 'oklch(0.331538 0.04734 250.976)',
    choiceSelectedForeground: 'oklch(0.825784 0.081948 250.514)',
    choiceSelectedBorder: 'oklch(0.743392 0.110862 251.054)',
    actionSecondary: 'oklch(0.190579 0.018873 275.681)',
    actionSecondaryForeground: 'oklch(0.972339 0.004673 84.5636)',
    actionSecondaryBorder: 'oklch(0.681873 0.045602 276.24)',
  },
} as const

// OKLab -> linear sRGB (D65), matching CSS Color 4 and the canonical web tests.
function oklchToHex(value: string) {
  const [lightness, chroma, hue] = value.slice(6, -1).split(' ').map(Number)
  const a = chroma * Math.cos(hue * Math.PI / 180)
  const b = chroma * Math.sin(hue * Math.PI / 180)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return '#' + rgb.map((channel) => {
    // Only floating-point tolerance; do not hide out-of-gamut colors by clipping.
    expect(channel).toBeGreaterThanOrEqual(-0.000001)
    expect(channel).toBeLessThanOrEqual(1.000001)
    const srgb = channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055
    return Math.round(Math.max(0, Math.min(1, srgb)) * 255).toString(16).padStart(2, '0')
  }).join('')
}

function luminance(hex: string) {
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}

function contrast(a: string, b: string) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y)
  return (high + 0.05) / (low + 0.05)
}

type Token = keyof typeof palette.light
const textPairs: [Token, Token][] = []
for (const surface of ['surfaceBase', 'surfaceRaised', 'surfaceOverlay'] as const) {
  for (const text of ['foreground', 'mutedForeground', 'primary', 'primaryAccent', 'ctaAccent',
    'successAccent', 'warningAccent', 'infoAccent', 'destructiveAccent'] as const) {
    textPairs.push([text, surface])
  }
}
for (const role of ['primary', 'cta', 'success', 'warning', 'info', 'destructive'] as const) {
  textPairs.push([`${role}Foreground`, role], [`${role}Accent`, `${role}Soft`])
  textPairs.push(['foreground', `${role}Soft`], ['mutedForeground', `${role}Soft`])
}
textPairs.push(['contextForeground', 'surfaceContext'], ['foreground', 'surfaceContext'], ['mutedForeground', 'surfaceContext'], ['cardForeground', 'card'], ['popoverForeground', 'popover'],
  ['secondaryForeground', 'secondary'], ['accentForeground', 'accent'], ['mutedForeground', 'muted'],
  ['primaryForeground', 'primaryHover'], ['destructiveForeground', 'destructiveHover'], ['ctaForeground', 'ctaHover'])

for (const role of ['contentAbsent', 'temporalEmphasis', 'statusNeutral', 'choiceSelected', 'actionSecondary'] as const) {
  textPairs.push([`${role}Foreground`, role])
}
textPairs.push(['choiceForeground', 'choiceBackground'])

describe.each(['light', 'dark'] as const)('canonical foundation in %s', (scheme) => {
  const colors = palette[scheme]
  it('derives every color from the exact canonical OKLCH with opaque 8-bit sRGB rounding', () => {
    for (const [token, oklch] of Object.entries(canonicalOklch[scheme])) {
      expect(colors[token as Token]).toBe(oklchToHex(oklch))
    }
    expect(colors.surfaceContext).toBe(colors.background)
    expect(colors.contextForeground).toBe(colors.foreground)
    expect(colors.statusNeutral).toBe(colors.muted)
    expect(colors.statusNeutralForeground).toBe(colors.mutedForeground)
    expect(colors.statusNeutralBorder).toBe(colors.border)
    expect(colors.choiceBackground).toBe(colors.card)
    expect(colors.choiceForeground).toBe(colors.foreground)
    expect(colors.choiceSelected).toBe(colors.primarySoft)
    expect(colors.choiceSelectedForeground).toBe(colors.primaryAccent)
    expect(colors.choiceSelectedBorder).toBe(colors.primary)
    expect(colors.actionSecondary).toBe(colors.background)
    expect(colors.actionSecondaryForeground).toBe(colors.foreground)
    expect(colors.actionSecondaryBorder).toBe(colors.input)
    expect(colors.background).toBe(colors.surfaceBase)
    expect(colors.card).toBe(colors.surfaceRaised)
    expect(colors.popover).toBe(colors.surfaceOverlay)
    for (const color of Object.values(colors)) expect(color).toMatch(/^#[a-f0-9]{6}$/)
  })

  it.each(textPairs)('%s on %s meets AA for normal text using actual rounded colors', (text, surface) => {
    expect(contrast(colors[text], colors[surface])).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps interactive boundaries and focus visible on all three planes', () => {
    for (const surface of [colors.surfaceBase, colors.surfaceRaised, colors.surfaceOverlay, colors.surfaceContext]) {
      expect(contrast(colors.input, surface)).toBeGreaterThanOrEqual(3)
      expect(contrast(colors.ring, surface)).toBeGreaterThanOrEqual(3)
    }
  })

  it('uses E0 for navigation canvas and E0 for fixed headers without native shadow or transparency', () => {
    const theme = navigationColors(colors)
    const stack = stackSurfaceOptions(colors)
    expect(theme.background).toBe(colors.surfaceBase)
    expect(theme.card).toBe(colors.surfaceBase)
    expect(stack.headerStyle.backgroundColor).toBe(colors.surfaceBase)
    expect(stack.contentStyle.backgroundColor).toBe(colors.surfaceBase)
    expect(stack.headerShadowVisible).toBe(false)
    expect(stack.headerTransparent).toBe(false)
  })
})

it('has only the canonical logical radii and a hard overlay contact edge', () => {
  expect([radius.sm, radius.md, radius.lg, radius.xl, radius.surface]).toEqual([4, 8, 12, 12, 12])
  expect(elevation.raised).toMatchObject({ elevation: 0, shadowOpacity: 0, shadowRadius: 0 })
  expect(elevation.overlay).toMatchObject({ elevation: 0, shadowOpacity: 0, shadowRadius: 0, borderBottomWidth: 2 })
})

it('preserves the dark planes and warm foreground while keeping the original light brand', () => {
  expect(palette.light.primary).toBe('#13467c')
  expect([palette.dark.surfaceBase, palette.dark.surfaceRaised, palette.dark.surfaceOverlay]).toEqual(['#11131c', '#1d2134', '#282e4d'])
  expect(palette.dark.foreground).toBe('#f7f6f2')
  expect(luminance(palette.dark.surfaceRaised)).toBeGreaterThan(luminance(palette.dark.surfaceBase))
  expect(luminance(palette.dark.surfaceOverlay)).toBeGreaterThan(luminance(palette.dark.surfaceRaised))
})

it('distinguishes light CTA text from its hover fill instead of reusing the dark accent', () => {
  expect(palette.light.cta).toBe('#e2661a')
  expect(palette.light.ctaForeground).toBe('#26160f')
  expect(contrast(palette.light.ctaForeground, palette.light.ctaHover)).toBeGreaterThanOrEqual(4.5)
  expect(contrast(palette.light.ctaForeground, palette.light.ctaAccent)).toBeLessThan(4.5)
})


// Distances use the rounded colors actually rendered, not the unrounded source.
function hexToOklab(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

it.each(['light', 'dark'] as const)('keeps absence, temporal emphasis and neutral status apart perceptually in %s', (mode) => {
  const colors = palette[mode]
  const roles = ['contentAbsent', 'temporalEmphasis', 'statusNeutral'] as const
  for (let i = 0; i < roles.length; i++) {
    for (let j = i + 1; j < roles.length; j++) {
      const a = hexToOklab(colors[roles[i]])
      const b = hexToOklab(colors[roles[j]])
      // Canonical palette regression floor, not a WCAG perception threshold.
      expect(Math.hypot(...a.map((channel, k) => channel - b[k]))).toBeGreaterThan(0.04)
    }
  }
})

it.each(['light', 'dark'] as const)('keeps new interactive boundaries and the temporal stripe above 3:1 in %s', (mode) => {
  const colors = palette[mode]
  for (const [border, fill] of [
    ['choiceBorder', 'choiceBackground'], ['choiceBorder', 'choiceSelected'],
    ['choiceSelectedBorder', 'choiceSelected'], ['actionSecondaryBorder', 'actionSecondary'],
    ['temporalEmphasisBorder', 'temporalEmphasis'],
  ] as const) expect(contrast(colors[border], colors[fill])).toBeGreaterThanOrEqual(3)
})
