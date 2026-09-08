import type { Colors } from './tokens'

/** Native chrome participates in the same planes as React Native content. */
export const navigationColors = (colors: Colors) => ({
  primary: colors.primary,
  background: colors.surfaceBase,
  card: colors.surfaceBase,
  text: colors.foreground,
  border: colors.border,
  notification: colors.destructive,
})

/** One opaque, titled bar for tab roots and pushed screens; navigators own back. */
export const screenHeaderOptions = (colors: Colors) => ({
  headerShown: true,
  headerTitleAlign: 'left' as const,
  headerStyle: { backgroundColor: colors.surfaceBase },
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.foreground },
  headerShadowVisible: false,
  headerTransparent: false,
})

export const stackSurfaceOptions = (colors: Colors) => ({
  ...screenHeaderOptions(colors),
  contentStyle: { backgroundColor: colors.surfaceBase },
})
