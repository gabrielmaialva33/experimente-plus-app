/**
 * Canonical web foundation: inertia/css/app.css and docs/design/catalog_tokens.md
 * (2026-09-08, approved Neutral cool / option B). Converted to rounded 8-bit sRGB in gamut.
 * E0 page and fixed chrome, E1 bounded content, E2 transient overlays.
 * Primary is brand/navigation; CTA fills actions, ctaAccent is text, ctaHover a fill.
 */
const lightSurfaces = {
  surfaceBase: '#f3f5f7',
  surfaceRaised: '#ffffff',
  surfaceOverlay: '#ffffff',
} as const

const darkSurfaces = {
  surfaceBase: '#11131c',
  surfaceRaised: '#1d2134',
  surfaceOverlay: '#282e4d',
} as const

const basePalette = {
  light: {
    ...lightSurfaces,
    background: lightSurfaces.surfaceBase,
    foreground: '#1e2227',
    card: lightSurfaces.surfaceRaised,
    cardForeground: '#1e2227',
    popover: lightSurfaces.surfaceOverlay,
    popoverForeground: '#1e2227',
    primary: '#13467c',
    primaryHover: '#0d3866',
    primaryForeground: '#ffffff',
    primarySoft: '#e9f2fe',
    primaryAccent: '#13467c',
    secondary: '#ffffff',
    secondaryForeground: '#1e2227',
    muted: '#e8ecf1',
    mutedForeground: '#535961',
    accent: '#e9f2fe',
    accentForeground: '#13467c',
    cta: '#e2661a',
    ctaHover: '#eb7b42',
    ctaForeground: '#26160f',
    ctaSoft: '#feeae1',
    ctaAccent: '#833f1b',
    destructive: '#b72822',
    destructiveHover: '#9b1f1b',
    destructiveForeground: '#ffffff',
    destructiveSoft: '#feeeeb',
    destructiveAccent: '#94221d',
    border: '#c7cbd0',
    input: '#73787f',
    ring: '#1a5695',
    scrim: '#06070e',
    success: '#117342',
    successForeground: '#ffffff',
    successSoft: '#e3f6e9',
    successAccent: '#0e5f36',
    warning: '#e9af41',
    warningForeground: '#3c260e',
    warningSoft: '#fdf1d8',
    warningAccent: '#6c461f',
    info: '#1b6684',
    infoForeground: '#ffffff',
    infoSoft: '#e3f4fd',
    infoAccent: '#185771',
    chart1: '#195fa9',
    chart2: '#eb550a',
    chart3: '#148cb8',
    chart4: '#2c966f',
    chart5: '#804dcb',
    contentAbsent: '#d3d6da',
    contentAbsentForeground: '#49515b',
    contentAbsentBorder: '#6a727d',
    temporalEmphasis: '#f9fbfe',
    temporalEmphasisForeground: '#333840',
    temporalEmphasisBorder: '#687380',
    choiceBorder: '#6e829b',
  },
  dark: {
    ...darkSurfaces,
    background: darkSurfaces.surfaceBase,
    foreground: '#f7f6f2',
    card: darkSurfaces.surfaceRaised,
    cardForeground: '#f7f6f2',
    popover: darkSurfaces.surfaceOverlay,
    popoverForeground: '#f7f6f2',
    primary: '#75b0f0',
    primaryHover: '#9ac5f4',
    primaryForeground: '#0f1324',
    primarySoft: '#23374d',
    primaryAccent: '#9ecafa',
    secondary: '#1d2134',
    secondaryForeground: '#f7f6f2',
    muted: '#1d2134',
    mutedForeground: '#cec6b6',
    accent: '#23374d',
    accentForeground: '#9ecafa',
    cta: '#f98c4d',
    ctaHover: '#f8bb8c',
    ctaForeground: '#29150a',
    ctaSoft: '#492f1d',
    ctaAccent: '#f8bb8c',
    destructive: '#ed6e6e',
    destructiveHover: '#f29292',
    destructiveForeground: '#240f0f',
    destructiveSoft: '#4c2424',
    destructiveAccent: '#f9a9a9',
    border: '#40486d',
    input: '#9197b6',
    ring: '#75b0f0',
    scrim: '#06070e',
    success: '#51d689',
    successForeground: '#11131c',
    successSoft: '#244230',
    successAccent: '#9aeabb',
    warning: '#f6b951',
    warningForeground: '#3a1d03',
    warningSoft: '#453821',
    warningAccent: '#f9d894',
    info: '#69cdf2',
    infoForeground: '#11131c',
    infoSoft: '#203c46',
    infoAccent: '#a1e0f7',
    chart1: '#519cec',
    chart2: '#f97f39',
    chart3: '#3abeee',
    chart4: '#3ecc98',
    chart5: '#a274e7',
    contentAbsent: '#191b1d',
    contentAbsentForeground: '#c1c8d1',
    contentAbsentBorder: '#515962',
    temporalEmphasis: '#383e45',
    temporalEmphasisForeground: '#d8dfe8',
    temporalEmphasisBorder: '#94a0ae',
    choiceBorder: '#8ba1ba',
  },
} as const

/** Semantic aliases follow the web source; neutral status is still muted. */
function withSemanticRoles<T extends (typeof basePalette)[keyof typeof basePalette]>(colors: T) {
  return {
    ...colors,
    surfaceContext: colors.background,
    contextForeground: colors.foreground,
    statusNeutral: colors.muted,
    statusNeutralForeground: colors.mutedForeground,
    statusNeutralBorder: colors.border,
    choiceBackground: colors.card,
    choiceForeground: colors.foreground,
    choiceSelected: colors.primarySoft,
    choiceSelectedForeground: colors.primaryAccent,
    choiceSelectedBorder: colors.primary,
    actionSecondary: colors.background,
    actionSecondaryForeground: colors.foreground,
    actionSecondaryBorder: colors.input,
  } as const
}

export const palette = {
  light: withSemanticRoles(basePalette.light),
  dark: withSemanticRoles(basePalette.dark),
} as const

export type ColorScheme = keyof typeof palette
export type Colors = (typeof palette)[ColorScheme]

/** Logical units, never PixelRatio-scaled. Full radius is only pill/circle geometry. */
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 12,
  surface: 12,
  pill: 999,
} as const

/** Opaque tonal planes; only overlays get a 2-unit contact edge, never diffuse shadow. */
export const elevation = {
  raised: { elevation: 0, shadowOpacity: 0, shadowRadius: 0 },
  overlay: { elevation: 0, shadowOpacity: 0, shadowRadius: 0, borderWidth: 1, borderBottomWidth: 2 },
} as const

/** Steps of 4, with no improvised intermediate values. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const typography = {
  title: { fontSize: 24, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
} as const
