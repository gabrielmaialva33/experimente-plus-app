import Ionicons from '@expo/vector-icons/Ionicons'
import { StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/button'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * An empty list that says what goes there and offers the way to fill it
 * (audit A34): an empty screen with no action is a dead end.
 */
export function EmptyState({
  icon,
  title,
  text,
  action,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  text?: string | null
  action?: { label: string; onPress: () => void }
  testID?: string
}) {
  const colors = useColors()

  return (
    <View testID={testID} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={26} color={colors.primaryAccent} />
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
        {title}
      </Text>
      {text ? <Text style={[styles.text, { color: colors.mutedForeground }]}>{text}</Text> : null}
      {action ? <Button label={action.label} variant="outline" onPress={action.onPress} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  icon: { alignItems: 'center', borderRadius: radius.pill, height: 56, justifyContent: 'center', width: 56 },
  title: { ...typography.heading, textAlign: 'center' },
  text: { ...typography.body, textAlign: 'center' },
})
