import { useEffect, useState } from 'react'
import {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

import { displayWeight, typography } from '@/theme/tokens'

/** How far a compact title rises into place, when motion is welcome. */
const RISE = 8

/** One line naming the screen in a compact header, in the display face. */
export const compactTitleText = { ...typography.heading, ...displayWeight('800') }

/**
 * A compact header that takes over as a screen's own header scrolls away
 * (direction A): between the scroll offsets `from` and `to` it fades in while
 * what it replaces fades out.
 *
 * The drawing follows the scroll on the UI thread. What touch and screen
 * readers reach is `compact`, a state that changes only when the offset crosses
 * the middle of that range — never once per frame — so exactly one of the two
 * sets of controls is exposed at a time.
 */
export function useCompactHeader(from: number, to: number) {
  const offset = useSharedValue(0)
  const start = useSharedValue(from)
  const end = useSharedValue(Math.max(to, from + 1))
  const crossed = useSharedValue(false)
  const [compact, setCompact] = useState(false)
  const reduceMotion = useReducedMotion()

  // The range follows layout: the safe area, a measured title.
  useEffect(() => {
    start.set(from)
    end.set(Math.max(to, from + 1))
  }, [from, to, start, end])

  const onScroll = useAnimatedScrollHandler((event) => {
    const y = event.contentOffset.y
    offset.set(y)
    const next = y >= (start.get() + end.get()) / 2
    if (next !== crossed.get()) {
      crossed.set(next)
      scheduleOnRN(setCompact, next)
    }
  })

  const progress = useDerivedValue(() =>
    interpolate(offset.get(), [start.get(), end.get()], [0, 1], Extrapolation.CLAMP)
  )
  const revealStyle = useAnimatedStyle(() => ({ opacity: progress.get() }))
  const concealStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }))
  // Reduced motion keeps the fade and drops the travel.
  const riseStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.get()) * RISE }],
  }))

  return { onScroll, compact, revealStyle, concealStyle, riseStyle }
}

export type CompactHeader = ReturnType<typeof useCompactHeader>

/**
 * Keeps a set of controls away from screen readers while the other set stands
 * in for it, so the same action is never announced twice.
 */
export function hiddenFromAccessibility(hidden: boolean) {
  return {
    accessibilityElementsHidden: hidden,
    importantForAccessibility: hidden ? ('no-hide-descendants' as const) : ('auto' as const),
  }
}
