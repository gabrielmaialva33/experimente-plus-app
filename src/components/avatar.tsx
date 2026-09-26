import { StyleSheet, Text, View } from 'react-native'

import { displayWeight, radius } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/** First and last initials of a name; one letter for a single word, "?" for none. */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return `${first}${last}`.toLocaleUpperCase('pt-BR')
}

/**
 * The person's initials in a circle. There is no photo to show (the product
 * stores none), and an empty silhouette says less than two letters.
 */
export function Avatar({ name, size = 64, tone = 'surface' }: { name: string | null | undefined; size?: number; tone?: 'surface' | 'chrome' }) {
  const colors = useColors()
  const background = tone === 'chrome' ? colors.chromeRaised : colors.primarySoft
  const foreground = tone === 'chrome' ? colors.chromeForeground : colors.primaryAccent

  return (
    <View
      testID="avatar"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.circle, { backgroundColor: background, height: size, width: size }]}>
      <Text style={[styles.initials, { color: foreground, fontSize: Math.round(size * 0.36) }]}>{initialsOf(name)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', borderRadius: radius.pill, justifyContent: 'center' },
  initials: displayWeight('800'),
})
