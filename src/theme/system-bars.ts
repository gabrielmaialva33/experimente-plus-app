import { requireOptionalNativeModule } from 'expo'
import { useEffect } from 'react'
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
