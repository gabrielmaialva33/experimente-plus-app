import { InstrumentSans_400Regular } from '@expo-google-fonts/instrument-sans/400Regular'
import { InstrumentSans_500Medium } from '@expo-google-fonts/instrument-sans/500Medium'
import { InstrumentSans_600SemiBold } from '@expo-google-fonts/instrument-sans/600SemiBold'
import { InstrumentSans_700Bold } from '@expo-google-fonts/instrument-sans/700Bold'
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold'
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold'
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold'
import { useFonts } from 'expo-font'
import { useEffect, useState } from 'react'

import { fontFamilies } from './tokens'

/**
 * The two families of direction A: Plus Jakarta Sans for display, Instrument
 * Sans — the web's text face — for everything read. Each weight is its own
 * family name, so Android never has to synthesise a bold from the regular face.
 * Only the weights the scale uses are bundled.
 */
export const fontSources = {
  [fontFamilies.text[400]]: InstrumentSans_400Regular,
  [fontFamilies.text[500]]: InstrumentSans_500Medium,
  [fontFamilies.text[600]]: InstrumentSans_600SemiBold,
  [fontFamilies.text[700]]: InstrumentSans_700Bold,
  [fontFamilies.display[600]]: PlusJakartaSans_600SemiBold,
  [fontFamilies.display[700]]: PlusJakartaSans_700Bold,
  [fontFamilies.display[800]]: PlusJakartaSans_800ExtraBold,
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
