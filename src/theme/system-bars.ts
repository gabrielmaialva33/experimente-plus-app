import { requireOptionalNativeModule } from 'expo'
import { useFocusEffect } from 'expo-router'
import { setStatusBarStyle } from 'expo-status-bar'
import { useCallback, useEffect } from 'react'
import { useColorScheme } from 'react-native'

type NavigationBarModule = { setStyle(style: 'light' | 'dark'): Promise<void> }

// Android only; iOS has no such module and gets null. Resolved on use, and cached by Expo.
const navigationBar = () => requireOptionalNativeModule<NavigationBarModule>('ExpoNavigationBar')

/**
 * Android draws the 3-button bar without a contrast scrim (`enforceContrast: false`
 * in app.json), so its buttons follow the theme: dark buttons on the light theme,
 * light ones on the dark theme.
 *
 * It calls the native module once per scheme and drops a failed call. The library's
 * `<NavigationBar>` component resets the bar when it unmounts, after the activity is
 * gone, and that rejected call surfaced as an uncaught error over the tab bar.
 */
export function useNavigationBarStyle() {
  const scheme = useColorScheme()

  useEffect(() => {
    navigationBar()
      ?.setStyle(scheme === 'dark' ? 'light' : 'dark')
      .catch(() => {})
  }, [scheme])
}

/** Screens in front whose navy band runs under the status bar. */
let bands = 0

/**
 * Light status bar icons while a screen whose navy band runs under the status
 * bar is in front: Explorar, Carteira, Conta, Entrar and a product's page.
 *
 * Conta and Entrar drew the band without asking for light icons, so theirs
 * were whatever the previous screen left: dark icons on navy after a stack
 * screen in the light theme. Bands are counted, so a tab that gains focus
 * before the previous one lets go keeps its light icons.
 */
export function useBandStatusBar(active = true) {
  useFocusEffect(
    useCallback(() => {
      if (!active) return
      bands += 1
      setStatusBarStyle('light')
      return () => {
        bands -= 1
        if (bands === 0) setStatusBarStyle('auto')
      }
    }, [active])
  )
}

/**
 * In the root layout. `setStatusBarStyle('auto')` reads the theme once, when
 * called: switching to light while a stack screen was open left light icons on
 * a light header, the clock and battery gone. When the theme changes and no
 * band is in front, the icons follow it again.
 */
export function useStatusBarFollowsTheme() {
  const scheme = useColorScheme()
  useEffect(() => {
    if (bands === 0) setStatusBarStyle('auto')
  }, [scheme])
}
