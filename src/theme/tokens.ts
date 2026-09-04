/**
 * Experimente+ design tokens.
 *
 * Inherited from the backend's `inertia/css/app.css` (ADR-0023 §6): the app does
 * not define a palette of its own. The source values are HSL; they are stored
 * here already converted to hex.
 *
 * The role separation is normative and must not be loosened:
 *   - `primary` is chrome — header, navigation, brand, links;
 *   - `cta` is conversion, and never reuses the brand color.
 */

export const palette = {
  light: {
    background: '#f8fafb',
    foreground: '#171f2b',
    card: '#ffffff',
    border: '#dae0e7',
    muted: '#eff2f5',
    mutedForeground: '#5c697a',
    primary: '#13467c',
    primaryForeground: '#ffffff',
    cta: '#c44708',
    ctaForeground: '#ffffff',
    success: '#1b7e46',
    warning: '#dc8f09',
    destructive: '#c52020',
    info: '#10789e',
    ring: '#195fa9',
  },
  dark: {
    background: '#0f161f',
    foreground: '#f2f5f8',
    card: '#151d28',
    border: '#2e3742',
    muted: '#232a34',
    mutedForeground: '#9ca7b4',
    primary: '#519cec',
    primaryForeground: '#0e1825',
    cta: '#f87325',
    ctaForeground: '#29150a',
    success: '#2fc66e',
    warning: '#f4aa2a',
    destructive: '#d93a3a',
    info: '#43c1ef',
    ring: '#519cec',
  },
} as const

export type ColorScheme = keyof typeof palette
export type Colors = (typeof palette)[ColorScheme]

/**
 * A deliberately short scale: the web's `--radius` for surfaces, full radius
 * only for chips and filter controls. There is no third position.
 */
export const radius = {
  surface: 10,
  pill: 999,
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
