import { useRef, useState, type ReactNode } from 'react'
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native'

import { spacing } from '@/theme/tokens'

/**
 * Constrain the viewport, not its scrollable content; cap each label to one viewport.
 *
 * `reveal` goes on the layout of the choice already made: a row longer than the
 * screen opens scrolled to it, instead of hiding it past the edge (the ninth
 * city of the list was out of sight when the picker opened on it).
 */
export function ChoiceRow({
  label,
  single = false,
  gutter = spacing.lg,
  children,
}: {
  label: string
  single?: boolean
  /** Where the first choice starts; it lines the row up with the screen's margin. */
  gutter?: number
  children: (maxItemWidth: number, reveal: (event: LayoutChangeEvent) => void) => ReactNode
}) {
  const window = useWindowDimensions()
  const [width, setWidth] = useState<number | null>(null)
  const maxItemWidth = Math.max(0, (width ?? window.width) - gutter * 2)
  const scroll = useRef<ScrollView>(null)
  // A choice's x is measured from the first one, which starts at the gutter.
  const reveal = (event: LayoutChangeEvent) =>
    scroll.current?.scrollTo({ x: event.nativeEvent.layout.x, animated: false })

  return (
    <View
      testID={`choice-row-${label}`}
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
      style={styles.viewport}
    >
      <ScrollView
        ref={scroll}
        testID={`choice-scroll-${label}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: gutter }}
      >
        <View
          accessibilityRole={single ? 'radiogroup' : undefined}
          accessibilityLabel={label}
          style={styles.options}
        >
          {children(maxItemWidth, reveal)}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  viewport: { width: '100%', minWidth: 0, maxWidth: '100%', overflow: 'hidden' },
  scroll: {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    flexGrow: 0,
    flexShrink: 1,
    overflow: 'hidden',
  },
  // Hit slop cannot extend beyond the immediate parent, so reserve it here.
  options: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
})
