import Ionicons from '@expo/vector-icons/Ionicons'
import { StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/button'
import { decorative } from '@/components/decorative'
import { MEASURE } from '@/components/content-frame'
import { HelpLink } from '@/help/help-link'
import type { HelpTopic } from '@/help/manual'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * An empty list that says what goes there and offers the way to fill it
 * (audit A34): an empty screen with no action is a dead end. A failure can add
 * a quiet way to the manual under its one action, for someone stuck there.
 */
export function EmptyState({
  icon,
  title,
  text,
  action,
  help,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  text?: string | null
  action?: { label: string; onPress: () => void }
  help?: { topic: HelpTopic; label: string }
  testID?: string
}) {
  const colors = useColors()

  return (
    <View
      testID={testID}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
    >
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]} {...decorative}>
        <Ionicons name={icon} size={26} color={colors.primaryAccent} />
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
        {title}
      </Text>
      {text ? <Text style={[styles.text, { color: colors.mutedForeground }]}>{text}</Text> : null}
      {action ? (
        <Button label={action.label} variant="outline" align="center" onPress={action.onPress} />
      ) : null}
      {help ? <HelpLink topic={help.topic} label={help.label} align="center" /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  // One message and one action: never wider than a line of text on a tablet.
  card: {
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: MEASURE.readable,
    width: '100%',
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  title: { ...typography.heading, textAlign: 'center' },
  text: { ...typography.body, textAlign: 'center' },
})
