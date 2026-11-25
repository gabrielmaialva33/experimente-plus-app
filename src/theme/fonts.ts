import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold'
import { Fredoka_700Bold } from '@expo-google-fonts/fredoka/700Bold'
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular'
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium'
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold'
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold'
import { useFonts } from 'expo-font'
import { useEffect, useState } from 'react'

import { fontFamilies } from './tokens'

/**
 * Identity v3 families: Fredoka (600, 700) for display titles at 18 and above,
 * and Plus Jakarta Sans (400–700) for everything read, operational or numeric.
 * Each weight is its own family name, so Android never synthesises a bold from
 * the regular face. Only the weights the scale uses are bundled.
 */
export const fontSources = {
  [fontFamilies.text[400]]: PlusJakartaSans_400Regular,
  [fontFamilies.text[500]]: PlusJakartaSans_500Medium,
  [fontFamilies.text[600]]: PlusJakartaSans_600SemiBold,
  [fontFamilies.text[700]]: PlusJakartaSans_700Bold,
  [fontFamilies.display[600]]: Fredoka_600SemiBold,
  [fontFamilies.display[700]]: Fredoka_700Bold,
}

/** Past this, the app shows with system faces rather than keep the splash up. */
export const FONT_TIMEOUT_MS = 3000

/**
 * True once the faces are usable, once they failed, or once waiting stopped
 * being worth it. The fonts ship inside the bundle, so the timeout is a floor
 * for a broken device, not the normal path; nothing ever waits forever.
 */
export function useFontsReady(timeoutMs = FONT_TIMEOUT_MS): boolean {
  const [loaded, error] = useFonts(fontSources)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (loaded || error) return
    const timer = setTimeout(() => setTimedOut(true), timeoutMs)
    return () => clearTimeout(timer)
  }, [loaded, error, timeoutMs])

  return loaded || Boolean(error) || timedOut
}
