import { typography, type Colors } from './tokens'

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
  // The bar names the screen in the display face, as the page titles do; the
  // platform's default face made "Criar conta" read as another app's header.
  headerTitleStyle: {
    color: colors.foreground,
    fontFamily: typography.heading.fontFamily,
    fontSize: 20,
  },
  headerShadowVisible: false,
  headerTransparent: false,
})

/**
 * Android draws edge to edge (target SDK 36): a pushed screen runs under the
 * system navigation bar, and its last action with it, unless the surface
 * reserves the bottom inset. Tab roots sit above the tab bar, which reserves it.
 */
export const stackSurfaceOptions = (colors: Colors, bottomInset = 0) => ({
  ...screenHeaderOptions(colors),
  contentStyle: { backgroundColor: colors.surfaceBase, paddingBottom: bottomInset },
})
