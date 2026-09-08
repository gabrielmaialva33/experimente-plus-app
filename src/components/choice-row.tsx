import { useState, type ReactNode } from 'react'
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'

import { spacing } from '@/theme/tokens'

/** Constrain the viewport, not its scrollable content; cap each label to one viewport. */
export function ChoiceRow({ label, single = false, children }: {
  label: string
  single?: boolean
  children: (maxItemWidth: number) => ReactNode
}) {
  const window = useWindowDimensions()
  const [width, setWidth] = useState<number | null>(null)
  const maxItemWidth = Math.max(0, (width ?? window.width) - spacing.lg * 2)

  return (
    <View
      testID={`choice-row-${label}`}
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
      style={styles.viewport}>
      <ScrollView
        testID={`choice-scroll-${label}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.content}>
        <View accessibilityRole={single ? 'radiogroup' : undefined} accessibilityLabel={label} style={styles.options}>
          {children(maxItemWidth)}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  viewport: { width: '100%', minWidth: 0, maxWidth: '100%', overflow: 'hidden' },
  scroll: { width: '100%', minWidth: 0, maxWidth: '100%', flexGrow: 0, flexShrink: 1, overflow: 'hidden' },
  content: { paddingHorizontal: spacing.lg },
  // Hit slop cannot extend beyond the immediate parent, so reserve it here.
  options: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
})
