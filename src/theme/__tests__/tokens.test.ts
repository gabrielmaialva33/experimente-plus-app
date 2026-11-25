import { navigationColors, stackSurfaceOptions } from '../navigation'
import {
  displayWeight,
  elevation,
  fontFamilies,
  minTouch,
  palette,
  radius,
  spacing,
  textWeight,
  typography,
} from '../tokens'

// Exact canonical CSS OKLCH, 2026-11-25 (Identity v3). Portable without the sibling checkout.
const canonicalOklch = {
  light: {
    surfaceBase: 'oklch(0.970803 0.008582 84.5727)',
    surfaceRaised: 'oklch(1 0 0)',
    surfaceOverlay: 'oklch(1 0 0)',
    surfaceContext: 'oklch(0.970803 0.008582 84.5727)',
    contextForeground: 'oklch(0.191872 0.012335 300.4537)',
    background: 'oklch(0.970803 0.008582 84.5727)',
    foreground: 'oklch(0.191872 0.012335 300.4537)',
    card: 'oklch(1 0 0)',
    cardForeground: 'oklch(0.191872 0.012335 300.4537)',
    popover: 'oklch(1 0 0)',
    popoverForeground: 'oklch(0.191872 0.012335 300.4537)',
    primary: 'oklch(0.512539 0.249145 282.559)',
    primaryHover: 'oklch(0.459909 0.243842 280.1774)',
    primaryForeground: 'oklch(1 0 0)',
    primarySoft: 'oklch(0.92244 0.042546 297.3672)',
    primaryAccent: 'oklch(0.512539 0.249145 282.559)',
    secondary: 'oklch(1 0 0)',
    secondaryForeground: 'oklch(0.191872 0.012335 300.4537)',
    muted: 'oklch(0.93242 0.0132 82.4017)',
    mutedForeground: 'oklch(0.41733 0.027292 302.2998)',
    accent: 'oklch(0.92244 0.042546 297.3672)',
    accentForeground: 'oklch(0.512539 0.249145 282.559)',
    cta: 'oklch(0.512539 0.249145 282.559)',
    ctaHover: 'oklch(0.459909 0.243842 280.1774)',
    ctaForeground: 'oklch(1 0 0)',
    ctaSoft: 'oklch(0.92244 0.042546 297.3672)',
    ctaAccent: 'oklch(0.512539 0.249145 282.559)',
    destructive: 'oklch(0.51 0.18 28)',
    destructiveHover: 'oklch(0.45 0.16 28)',
    destructiveForeground: 'oklch(1 0 0)',
    destructiveSoft: 'oklch(0.96 0.018 28)',
    destructiveAccent: 'oklch(0.44 0.15 28)',
    border: 'oklch(0.835637 0.015803 77.0551)',
    borderSubtle: 'oklch(0.896463 0.015011 80.7045)',
    input: 'oklch(0.560405 0.025706 305.3086)',
    ring: 'oklch(0.512539 0.249145 282.559)',
    scrim: 'oklch(0.14425 0.022092 297.7801)',
    chrome: 'oklch(0.276085 0.119466 291.8784)',
    chromeRaised: 'oklch(0.340972 0.149065 291.3074)',
    chromeForeground: 'oklch(1 0 0)',
    chromeMuted: 'oklch(0.887683 0.047166 297.5432)',
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
    chart1: 'oklch(0.512539 0.249145 282.559)',
    chart2: 'oklch(0.643847 0.197989 40.1886)',
    chart3: 'oklch(0.600557 0.115234 230.003)',
    chart4: 'oklch(0.603664 0.11314 164.187)',
    chart5: 'oklch(0.68 0.13 88)',
    contentAbsent: 'oklch(0.890347 0.015036 80.7042)',
    contentAbsentForeground: 'oklch(0.405382 0.02433 304.7342)',
    contentAbsentBorder: 'oklch(0.529289 0.026074 305.2639)',
    temporalEmphasis: 'oklch(0.985526 0.005706 84.566)',
    temporalEmphasisForeground: 'oklch(0.289839 0.020505 301.7102)',
    temporalEmphasisBorder: 'oklch(0.519198 0.027675 304.0952)',
    choiceBorder: 'oklch(0.554441 0.045784 300.6741)',
    statusNeutral: 'oklch(0.93242 0.0132 82.4017)',
    statusNeutralForeground: 'oklch(0.41733 0.027292 302.2998)',
    statusNeutralBorder: 'oklch(0.835637 0.015803 77.0551)',
    choiceBackground: 'oklch(1 0 0)',
    choiceForeground: 'oklch(0.191872 0.012335 300.4537)',
    choiceSelected: 'oklch(0.92244 0.042546 297.3672)',
    choiceSelectedForeground: 'oklch(0.512539 0.249145 282.559)',
    choiceSelectedBorder: 'oklch(0.512539 0.249145 282.559)',
    actionSecondary: 'oklch(0.970803 0.008582 84.5727)',
    actionSecondaryForeground: 'oklch(0.191872 0.012335 300.4537)',
    actionSecondaryBorder: 'oklch(0.560405 0.025706 305.3086)',
  },
  dark: {
    surfaceBase: 'oklch(0.191872 0.012335 300.4537)',
    surfaceRaised: 'oklch(0.255827 0.037783 297.4532)',
    surfaceOverlay: 'oklch(0.309395 0.059196 298.2254)',
    surfaceContext: 'oklch(0.191872 0.012335 300.4537)',
    contextForeground: 'oklch(0.970803 0.008582 84.5727)',
    background: 'oklch(0.191872 0.012335 300.4537)',
    foreground: 'oklch(0.970803 0.008582 84.5727)',
    card: 'oklch(0.255827 0.037783 297.4532)',
    cardForeground: 'oklch(0.970803 0.008582 84.5727)',
    popover: 'oklch(0.309395 0.059196 298.2254)',
    popoverForeground: 'oklch(0.970803 0.008582 84.5727)',
    primary: 'oklch(0.75462 0.139431 293.5685)',
    primaryHover: 'oklch(0.817144 0.102837 295.3497)',
    primaryForeground: 'oklch(0.191872 0.012335 300.4537)',
    primarySoft: 'oklch(0.303444 0.091729 292.2217)',
    primaryAccent: 'oklch(0.851565 0.082378 295.4794)',
    secondary: 'oklch(0.255827 0.037783 297.4532)',
    secondaryForeground: 'oklch(0.970803 0.008582 84.5727)',
    muted: 'oklch(0.215641 0.025756 298.3349)',
    mutedForeground: 'oklch(0.844406 0.014028 78.2525)',
    accent: 'oklch(0.303444 0.091729 292.2217)',
    accentForeground: 'oklch(0.851565 0.082378 295.4794)',
    cta: 'oklch(0.75462 0.139431 293.5685)',
    ctaHover: 'oklch(0.817144 0.102837 295.3497)',
    ctaForeground: 'oklch(0.191872 0.012335 300.4537)',
    ctaSoft: 'oklch(0.303444 0.091729 292.2217)',
    ctaAccent: 'oklch(0.851565 0.082378 295.4794)',
    destructive: 'oklch(0.690037 0.157955 22.0757)',
    destructiveHover: 'oklch(0.759377 0.1158 20.1165)',
    destructiveForeground: 'oklch(0.200316 0.034587 20.5948)',
    destructiveSoft: 'oklch(0.315933 0.059434 20.9791)',
    destructiveAccent: 'oklch(0.812146 0.095733 19.3507)',
    border: 'oklch(0.397432 0.057737 298.613)',
    borderSubtle: 'oklch(0.323808 0.049956 298.3488)',
    input: 'oklch(0.681599 0.043515 300.9769)',
    ring: 'oklch(0.75462 0.139431 293.5685)',
    scrim: 'oklch(0.14425 0.022092 297.7801)',
    chrome: 'oklch(0.276085 0.119466 291.8784)',
    chromeRaised: 'oklch(0.326249 0.141534 291.4106)',
    chromeForeground: 'oklch(0.970803 0.008582 84.5727)',
    chromeMuted: 'oklch(0.859946 0.053324 298.5108)',
    success: 'oklch(0.784753 0.160935 154.357)',
    successForeground: 'oklch(0.191872 0.012335 300.4537)',
    successSoft: 'oklch(0.350415 0.048455 157.136)',
    successAccent: 'oklch(0.871761 0.101829 157.856)',
    warning: 'oklch(0.823357 0.138274 78.2444)',
    warningForeground: 'oklch(0.265459 0.05917 57.8617)',
    warningSoft: 'oklch(0.347772 0.040173 80.4926)',
    warningAccent: 'oklch(0.894623 0.092856 84.1027)',
    info: 'oklch(0.802723 0.106996 224.388)',
    infoForeground: 'oklch(0.191872 0.012335 300.4537)',
    infoSoft: 'oklch(0.338604 0.038788 223.55)',
    infoAccent: 'oklch(0.871998 0.070834 222.52)',
    chart1: 'oklch(0.75462 0.139431 293.5685)',
    chart2: 'oklch(0.725074 0.169254 47.5318)',
    chart3: 'oklch(0.75134 0.129544 227.307)',
    chart4: 'oklch(0.755915 0.142212 164.125)',
    chart5: 'oklch(0.82 0.13 90)',
    contentAbsent: 'oklch(0.214478 0.013892 298.2918)',
    contentAbsentForeground: 'oklch(0.834167 0.017365 304.7572)',
    contentAbsentBorder: 'oklch(0.512576 0.029253 303.0391)',
    temporalEmphasis: 'oklch(0.352377 0.035347 300.62)',
    temporalEmphasisForeground: 'oklch(0.923529 0.01821 303.403)',
    temporalEmphasisBorder: 'oklch(0.695227 0.036045 302.5053)',
    choiceBorder: 'oklch(0.663066 0.054247 300.165)',
    statusNeutral: 'oklch(0.255827 0.037783 297.4532)',
    statusNeutralForeground: 'oklch(0.844406 0.014028 78.2525)',
    statusNeutralBorder: 'oklch(0.397432 0.057737 298.613)',
    choiceBackground: 'oklch(0.255827 0.037783 297.4532)',
    choiceForeground: 'oklch(0.970803 0.008582 84.5727)',
    choiceSelected: 'oklch(0.303444 0.091729 292.2217)',
    choiceSelectedForeground: 'oklch(0.851565 0.082378 295.4794)',
    choiceSelectedBorder: 'oklch(0.75462 0.139431 293.5685)',
    actionSecondary: 'oklch(0.191872 0.012335 300.4537)',
    actionSecondaryForeground: 'oklch(0.970803 0.008582 84.5727)',
    actionSecondaryBorder: 'oklch(0.681599 0.043515 300.9769)',
  },
} as const

// OKLab -> linear sRGB (D65), matching CSS Color 4 and the canonical web tests.
function oklchToHex(value: string) {
  const [lightness, chroma, hue] = value.slice(6, -1).split(' ').map(Number)
  const a = chroma * Math.cos((hue * Math.PI) / 180)
  const b = chroma * Math.sin((hue * Math.PI) / 180)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return (
    '#' +
    rgb
      .map((channel) => {
        // Only floating-point tolerance; do not hide out-of-gamut colors by clipping.
        expect(channel).toBeGreaterThanOrEqual(-0.000001)
        expect(channel).toBeLessThanOrEqual(1.000001)
        const srgb = channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055
        return Math.round(Math.max(0, Math.min(1, srgb)) * 255)
          .toString(16)
          .padStart(2, '0')
      })
      .join('')
  )
}

function luminance(hex: string) {
  const rgb = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}

function contrast(a: string, b: string) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y)
  return (high + 0.05) / (low + 0.05)
}

type Token = keyof typeof palette.light
const textPairs: [Token, Token][] = []
for (const surface of ['surfaceBase', 'surfaceRaised', 'surfaceOverlay'] as const) {
  for (const text of [
    'foreground',
    'mutedForeground',
    'primary',
    'primaryAccent',
    'ctaAccent',
    'successAccent',
    'warningAccent',
    'infoAccent',
    'destructiveAccent',
  ] as const) {
    textPairs.push([text, surface])
  }
}
for (const role of ['primary', 'cta', 'success', 'warning', 'info', 'destructive'] as const) {
  textPairs.push([`${role}Foreground`, role], [`${role}Accent`, `${role}Soft`])
  textPairs.push(['foreground', `${role}Soft`], ['mutedForeground', `${role}Soft`])
}
textPairs.push(
  ['contextForeground', 'surfaceContext'],
  ['foreground', 'surfaceContext'],
  ['mutedForeground', 'surfaceContext'],
  ['cardForeground', 'card'],
  ['popoverForeground', 'popover'],
  ['secondaryForeground', 'secondary'],
  ['accentForeground', 'accent'],
  ['mutedForeground', 'muted'],
  ['primaryForeground', 'primaryHover'],
  ['destructiveForeground', 'destructiveHover'],
  ['ctaForeground', 'ctaHover']
)

for (const role of [
  'contentAbsent',
  'temporalEmphasis',
  'statusNeutral',
  'choiceSelected',
  'actionSecondary',
] as const) {
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
    expect(colors.statusNeutral).toBe(scheme === 'light' ? colors.muted : colors.surfaceRaised)
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

  it.each(textPairs)(
    '%s on %s meets AA for normal text using actual rounded colors',
    (text, surface) => {
      expect(contrast(colors[text], colors[surface])).toBeGreaterThanOrEqual(4.5)
    }
  )

  it('keeps interactive boundaries and focus visible on all three planes', () => {
    for (const surface of [
      colors.surfaceBase,
      colors.surfaceRaised,
      colors.surfaceOverlay,
      colors.surfaceContext,
    ]) {
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
    // Titles in the display face, like every page title.
    expect(stack.headerTitleStyle.fontFamily).toBe(typography.heading.fontFamily)
  })
})

it('has only the canonical logical radii and a hard overlay contact edge', () => {
  expect([radius.sm, radius.md, radius.lg, radius.xl, radius.surface]).toEqual([4, 8, 12, 12, 12])
  expect(elevation.raised).toMatchObject({ elevation: 0, shadowOpacity: 0, shadowRadius: 0 })
  expect(elevation.overlay).toMatchObject({
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    borderBottomWidth: 2,
  })
})

it('preserves the dark planes and warm foreground while keeping the v3 light brand', () => {
  expect(palette.light.primary).toBe('#5e39ed')
  expect(palette.light.chrome).toBe('#2c145c')
  expect([
    palette.dark.surfaceBase,
    palette.dark.surfaceRaised,
    palette.dark.surfaceOverlay,
  ]).toEqual(['#151319', '#251f33', '#34294a'])
  expect(palette.dark.foreground).toBe('#f8f5ef')
  expect(luminance(palette.dark.surfaceRaised)).toBeGreaterThan(luminance(palette.dark.surfaceBase))
  expect(luminance(palette.dark.surfaceOverlay)).toBeGreaterThan(
    luminance(palette.dark.surfaceRaised)
  )
})

it.each(['light', 'dark'] as const)(
  'unifies CTA with primary violet while keeping structural chrome perceptually distinct in %s',
  (mode) => {
    const colors = palette[mode]
    expect(colors.cta).toBe(colors.primary)
    expect(colors.ctaHover).toBe(colors.primaryHover)
    expect(colors.ctaForeground).toBe(colors.primaryForeground)
    expect(colors.ctaSoft).toBe(colors.primarySoft)
    expect(colors.ctaAccent).toBe(colors.primaryAccent)
    expect(contrast(colors.ctaForeground, colors.ctaHover)).toBeGreaterThanOrEqual(4.5)
    const a = hexToOklab(colors.primary)
    const b = hexToOklab(colors.chrome)
    expect(Math.hypot(...a.map((channel, k) => channel - b[k]))).toBeGreaterThan(0.2)
  }
)

// Distances use the rounded colors actually rendered, not the unrounded source.
function hexToOklab(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

it.each(['light', 'dark'] as const)(
  'keeps absence, temporal emphasis and neutral status apart perceptually in %s',
  (mode) => {
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
  }
)

it.each(['light', 'dark'] as const)(
  'keeps new interactive boundaries and the temporal stripe above 3:1 in %s',
  (mode) => {
    const colors = palette[mode]
    for (const [border, fill] of [
      ['choiceBorder', 'choiceBackground'],
      ['choiceBorder', 'choiceSelected'],
      ['choiceSelectedBorder', 'choiceSelected'],
      ['actionSecondaryBorder', 'actionSecondary'],
      ['temporalEmphasisBorder', 'temporalEmphasis'],
    ] as const)
      expect(contrast(colors[border], colors[fill])).toBeGreaterThanOrEqual(3)
  }
)

it('gives every role of the direction A scale a loaded face and an explicit line height', () => {
  const display = Object.values(fontFamilies.display) as string[]
  const text = Object.values(fontFamilies.text) as string[]
  for (const role of ['display', 'title', 'heading'] as const) {
    expect(display).toContain(typography[role].fontFamily)
  }
  for (const role of ['body', 'label', 'meta', 'caption', 'overline'] as const) {
    expect(text).toContain(typography[role].fontFamily)
  }
  for (const style of Object.values(typography)) {
    expect(style).not.toHaveProperty('fontWeight')
    expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize)
  }
  expect([
    typography.display.fontSize,
    typography.title.fontSize,
    typography.heading.fontSize,
    typography.body.fontSize,
  ]).toEqual([30, 21, 18, 16])
  expect(typography.display.letterSpacing).toBe(0)
  expect(typography.title.letterSpacing).toBe(0)
})

it('turns a weight into its real face and never past the family', () => {
  expect(textWeight('400')).toEqual({ fontFamily: fontFamilies.text[400] })
  expect(textWeight(600)).toEqual({ fontFamily: fontFamilies.text[600] })
  expect(textWeight('800')).toEqual({ fontFamily: fontFamilies.text[700] })
  expect(displayWeight('400')).toEqual({ fontFamily: fontFamilies.display[600] })
  expect(displayWeight('700')).toEqual({ fontFamily: fontFamilies.display[700] })
  expect(displayWeight(800)).toEqual({ fontFamily: fontFamilies.display[700] })
})

it('adds the card, thumbnail and sheet radii, the gutter and the section rhythm of direction A', () => {
  expect([radius.thumb, radius.card, radius.sheet, radius.pill]).toEqual([16, 20, 28, 999])
  expect([spacing.gutter, spacing.section]).toEqual([20, 28])
  expect(minTouch).toBe(44)
})

it.each(['light', 'dark'] as const)(
  'keeps the subtle border decorative: visible on cards, quieter than an interactive boundary, in %s',
  (mode) => {
    const colors = palette[mode]
    for (const surface of [colors.surfaceBase, colors.surfaceRaised]) {
      expect(contrast(colors.borderSubtle, surface)).toBeGreaterThan(1.1)
      expect(contrast(colors.borderSubtle, surface)).toBeLessThan(contrast(colors.border, surface))
    }
  }
)

it.each(['light', 'dark'] as const)(
  'keeps the header band readable: text and chips on it meet AA in %s',
  (mode) => {
    const colors = palette[mode]
    expect(contrast(colors.chromeForeground, colors.chrome)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.chromeMuted, colors.chrome)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.chromeForeground, colors.chromeRaised)).toBeGreaterThanOrEqual(4.5)
  }
)
