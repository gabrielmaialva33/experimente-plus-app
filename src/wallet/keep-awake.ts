import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { useIsFocused } from 'expo-router'
import { useEffect } from 'react'

/**
 * The presentation's own hold on the screen. Holds are counted per tag, so
 * releasing this one never lets go of another (the dev tools keep one under the
 * default tag), and another never keeps this one.
 */
export const PRESENTATION_AWAKE_TAG = 'experimente-plus.presentation-code'

/**
 * Keeps the screen on while a code is `shown` on the screen in front: the
 * partner may take a moment to point the camera, and a phone that dims or locks
 * in the meantime takes the code away. It lets go as soon as the code goes
 * (expired, used, replaced), the screen loses focus or it unmounts. Brightness
 * is left alone.
 *
 * Where the hold cannot be taken (no activity yet, a browser without Wake Lock)
 * the phone keeps its usual timeout: nothing breaks, and there is nothing to say.
 */
export function useKeepAwakeWhileShown(shown: boolean) {
  const focused = useIsFocused()
  const active = shown && focused

  useEffect(() => {
    if (!active) return
    activateKeepAwakeAsync(PRESENTATION_AWAKE_TAG).catch(() => {})
    return () => {
      deactivateKeepAwake(PRESENTATION_AWAKE_TAG).catch(() => {})
    }
  }, [active])
}
