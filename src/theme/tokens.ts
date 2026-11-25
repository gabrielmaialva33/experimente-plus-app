/**
 * Canonical web foundation: inertia/css/app.css (Identity v3).
 * Converted to rounded 8-bit sRGB in gamut, with exact round-trip parity.
 * E0 warm off-white page, E1 bounded content cards, E2 transient overlays;
 * violet carries navigation, selection and conversion, and deep purple carries chrome.
 */
const lightSurfaces = {
  surfaceBase: '#f8f5ef',
  surfaceRaised: '#ffffff',
  surfaceOverlay: '#ffffff',
} as const

const darkSurfaces = {
  surfaceBase: '#151319',
  surfaceRaised: '#251f33',
  surfaceOverlay: '#34294a',
} as const

const basePalette = {
  light: {
    ...lightSurfaces,
    background: lightSurfaces.surfaceBase,
    foreground: '#151319',
    card: lightSurfaces.surfaceRaised,
    cardForeground: '#151319',
    popover: lightSurfaces.surfaceOverlay,
    popoverForeground: '#151319',
    primary: '#5e39ed',
    primaryHover: '#4c28d9',
    primaryForeground: '#ffffff',
    primarySoft: '#e8e0ff',
    primaryAccent: '#5e39ed',
    secondary: '#ffffff',
    secondaryForeground: '#151319',
    muted: '#ede8df',
    mutedForeground: '#4f4959',
    accent: '#e8e0ff',
    accentForeground: '#5e39ed',
    cta: '#5e39ed',
    ctaHover: '#4c28d9',
    ctaForeground: '#ffffff',
    ctaSoft: '#e8e0ff',
    ctaAccent: '#5e39ed',
    destructive: '#b72822',
    destructiveHover: '#9b1f1b',
    destructiveForeground: '#ffffff',
    destructiveSoft: '#feeeeb',
    destructiveAccent: '#94221d',
    border: '#cfc8be',
    input: '#787181',
    ring: '#5e39ed',
    scrim: '#0b0812',
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
    chart1: '#5e39ed',
    chart2: '#eb550a',
    chart3: '#148cb8',
    chart4: '#2c966f',
    chart5: '#ba9320',
    contentAbsent: '#e0dad0',
    contentAbsentForeground: '#4c4654',
    contentAbsentBorder: '#6f6878',
    borderSubtle: '#e2dcd2',
    // Structural chrome (header band and active ticket stubs): brand deep purple,
    // distinct from the violet action role in both themes.
    chrome: '#2c145c',
    chromeRaised: '#3d1e7d',
    chromeForeground: '#ffffff',
    chromeMuted: '#ddd4f6',
    temporalEmphasis: '#fcfaf6',
    temporalEmphasisForeground: '#2d2934',
    temporalEmphasisBorder: '#6c6576',
    choiceBorder: '#776d8a',
  },
  dark: {
    ...darkSurfaces,
    background: darkSurfaces.surfaceBase,
    foreground: '#f8f5ef',
    card: darkSurfaces.surfaceRaised,
    cardForeground: '#f8f5ef',
    popover: darkSurfaces.surfaceOverlay,
    popoverForeground: '#f8f5ef',
    primary: '#b49dff',
    primaryHover: '#c8b6ff',
    primaryForeground: '#151319',
    primarySoft: '#312358',
    primaryAccent: '#d2c4ff',
    secondary: '#251f33',
    secondaryForeground: '#f8f5ef',
    // Below surfaceRaised, like the light muted under white (web --muted).
    muted: '#1b1724',
    mutedForeground: '#d1cbc2',
    accent: '#312358',
    accentForeground: '#d2c4ff',
    cta: '#b49dff',
    ctaHover: '#c8b6ff',
    ctaForeground: '#151319',
    ctaSoft: '#312358',
    ctaAccent: '#d2c4ff',
    destructive: '#ed6e6e',
    destructiveHover: '#f29292',
    destructiveForeground: '#240f0f',
    destructiveSoft: '#4c2424',
    destructiveAccent: '#f9a9a9',
    border: '#4b4062',
    input: '#9d93b0',
    ring: '#b49dff',
    scrim: '#0b0812',
    success: '#51d689',
    successForeground: '#151319',
    successSoft: '#244230',
    successAccent: '#9aeabb',
    warning: '#f6b951',
    warningForeground: '#3a1d03',
    warningSoft: '#453821',
    warningAccent: '#f9d894',
    info: '#69cdf2',
    infoForeground: '#151319',
    infoSoft: '#203c46',
    infoAccent: '#a1e0f7',
    chart1: '#b49dff',
    chart2: '#f97f39',
    chart3: '#3abeee',
    chart4: '#3ecc98',
    chart5: '#e5c057',
    contentAbsent: '#1a181f',
    contentAbsentForeground: '#cbc6d2',
    contentAbsentBorder: '#6a6375',
    borderSubtle: '#372e4a',
    chrome: '#2c145c',
    chromeRaised: '#391c75',
    chromeForeground: '#f8f5ef',
    chromeMuted: '#d5caf0',
    temporalEmphasis: '#3e374b',
    temporalEmphasisForeground: '#e8e3f0',
    temporalEmphasisBorder: '#a198b0',
    choiceBorder: '#988cb0',
  },
} as const

/**
 * Semantic aliases follow the web source. Neutral status is muted in light; in dark,
 * where muted now sits below the card, it keeps the raised surface, so it stays
 * apart from absent content (web --status-neutral).
 */
function withSemanticRoles<T extends (typeof basePalette)[keyof typeof basePalette]>(
  colors: T,
  statusNeutral: string = colors.muted
) {
  return {
    ...colors,
    surfaceContext: colors.background,
    contextForeground: colors.foreground,
    statusNeutral,
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

/**
 * A palette colour at an opacity, for the tinted borders of the web's status
 * pills (`border-success/25`). The palette stores hex, so the alpha is explicit.
 */
export function withOpacity(hex: string, opacity: number): string {
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
  return `rgba(${rgb.join(', ')}, ${opacity})`
}

export const palette = {
  light: withSemanticRoles(basePalette.light),
  dark: withSemanticRoles(basePalette.dark, darkSurfaces.surfaceRaised),
} as const

export type ColorScheme = keyof typeof palette
export type Colors = (typeof palette)[ColorScheme]

/**
 * Logical units, never PixelRatio-scaled. Full radius is only pill/circle geometry.
 * Direction A adds the card, thumbnail and sheet radii; the canonical ones stay.
 */
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 12,
  surface: 12,
  thumb: 16,
  card: 20,
  sheet: 28,
  pill: 999,
} as const

/** Opaque tonal planes; only overlays get a 2-unit contact edge, never diffuse shadow. */
export const elevation = {
  raised: { elevation: 0, shadowOpacity: 0, shadowRadius: 0 },
  overlay: {
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 2,
  },
} as const

/** Steps of 4, with no improvised intermediate values. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  /** Screen gutter of direction A. */
  gutter: 20,
  xl: 24,
  /** Between sections of a screen. */
  section: 28,
  xxl: 32,
} as const

/** The smallest touch target, whatever the drawing inside it. */
export const minTouch = 44

/**
 * Each weight is its own loaded family (see `theme/fonts.ts`): Android draws the
 * real face instead of synthesising a bold, and iOS never falls back to the
 * system font for a weight the family lacks.
 */
export const fontFamilies = {
  text: {
    400: 'PlusJakartaSans_400Regular',
    500: 'PlusJakartaSans_500Medium',
    600: 'PlusJakartaSans_600SemiBold',
    700: 'PlusJakartaSans_700Bold',
  },
  display: {
    600: 'Fredoka_600SemiBold',
    700: 'Fredoka_700Bold',
  },
} as const

type WeightInput = '400' | '500' | '600' | '700' | '800' | 400 | 500 | 600 | 700 | 800

/** A text weight as its face. Text stops at 700; heavier asks come back as 700. */
export function textWeight(weight: WeightInput) {
  const value = Number(weight)
  const step = value >= 700 ? 700 : value >= 600 ? 600 : value >= 500 ? 500 : 400
  return { fontFamily: fontFamilies.text[step] }
}

/** A display weight as its face. Fredoka spans 600–700; heavier asks cap at 700. */
export function displayWeight(weight: WeightInput) {
  const value = Number(weight)
  const step = value >= 700 ? 700 : 600
  return { fontFamily: fontFamilies.display[step] }
}

/**
 * Identity v3 scale. Display roles at 18 and above (display, title, heading) use
 * Fredoka without negative tracking; everything read, operational or numeric uses
 * Plus Jakarta Sans. Line heights are explicit so a face swap never moves layout.
 */
export const typography = {
  display: {
    fontFamily: fontFamilies.display[700],
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: 0,
  },
  title: {
    fontFamily: fontFamilies.display[700],
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: 0,
  },
  heading: { fontFamily: fontFamilies.display[700], fontSize: 18, lineHeight: 23 },
  body: { fontFamily: fontFamilies.text[400], fontSize: 16, lineHeight: 23 },
  label: { fontFamily: fontFamilies.text[600], fontSize: 15, lineHeight: 20 },
  meta: { fontFamily: fontFamilies.text[500], fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fontFamilies.text[500], fontSize: 13, lineHeight: 17 },
  overline: {
    fontFamily: fontFamilies.text[700],
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
} as const
