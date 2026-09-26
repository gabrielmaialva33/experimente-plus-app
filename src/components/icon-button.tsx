import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet } from 'react-native'

import { minTouch, radius } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap
  /** Required: an icon alone says nothing to a screen reader. */
  accessibilityLabel: string
  onPress: () => void
  /** `surface` sits on a card, `image` on a photo, `chrome` on the header band. */
  tone?: 'surface' | 'image' | 'chrome' | 'plain'
  selected?: boolean
  testID?: string
}

/** A 44-unit circle: the smallest target the app draws. */
export function IconButton({ icon, accessibilityLabel, onPress, tone = 'surface', selected, testID }: IconButtonProps) {
  const colors = useColors()
  const appearance = {
    surface: { background: colors.card, border: colors.borderSubtle, foreground: colors.primary },
    image: { background: '#ffffff', border: '#ffffff', foreground: '#13467c' },
    chrome: { background: colors.chromeRaised, border: colors.chromeRaised, foreground: colors.chromeForeground },
    plain: { background: 'transparent', border: 'transparent', foreground: colors.mutedForeground },
  }[tone]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      testID={testID}
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: appearance.background, borderColor: appearance.border, opacity: pressed ? 0.8 : 1 },
      ]}>
      <Ionicons name={icon} size={22} color={appearance.foreground} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: minTouch,
    justifyContent: 'center',
    width: minTouch,
  },
})
