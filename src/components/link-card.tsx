import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { minTouch, radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export type LinkCardTone = 'primary' | 'warning' | 'neutral'

/**
 * A whole card that leads somewhere (direction A): a pending order to follow
 * (`warning`), a shortcut to more benefits (`primary`, the soft support plane
 * with a round arrow), a record to open (`neutral`). The tone only reinforces
 * the title, which always says it in words.
 */
export function LinkCard({
  title,
  subtitle,
  icon,
  tone = 'neutral',
  onPress,
  accessibilityLabel,
  testID,
}: {
  title: string
  subtitle?: string | null
  /** A leading glyph in a round well; the `primary` card leads with its title instead. */
  icon?: keyof typeof Ionicons.glyphMap
  tone?: LinkCardTone
  onPress: () => void
  accessibilityLabel?: string
  testID?: string
}) {
  const colors = useColors()
  const appearance = {
    primary: { background: colors.primarySoft, border: colors.primarySoft, title: colors.primaryAccent, subtitle: colors.foreground, icon: colors.primaryAccent },
    warning: { background: colors.warningSoft, border: colors.warningSoft, title: colors.foreground, subtitle: colors.warningAccent, icon: colors.warningAccent },
    neutral: { background: colors.card, border: colors.borderSubtle, title: colors.foreground, subtitle: colors.mutedForeground, icon: colors.primaryAccent },
  }[tone]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}. ${subtitle}` : title)}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        tone === 'primary' && styles.roomy,
        { backgroundColor: appearance.background, borderColor: appearance.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      {icon && tone !== 'primary' ? (
        <View style={[styles.well, { backgroundColor: colors.card }]}>
          <Ionicons name={icon} size={20} color={appearance.icon} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={[tone === 'primary' ? styles.headline : styles.title, { color: appearance.title }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: appearance.subtitle }]}>{subtitle}</Text> : null}
      </View>
      {tone === 'primary' ? (
        <View style={[styles.go, { backgroundColor: colors.chrome }]}>
          <Ionicons name="arrow-forward" size={20} color={colors.chromeForeground} />
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={appearance.icon} />
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  roomy: { padding: 18 },
  well: { alignItems: 'center', borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  copy: { flex: 1, gap: 2, justifyContent: 'center', minHeight: minTouch - 4 },
  title: { ...typography.label, ...textWeight('700') },
  headline: { ...typography.heading, fontFamily: typography.title.fontFamily },
  subtitle: typography.meta,
  go: { alignItems: 'center', borderRadius: radius.pill, height: minTouch, justifyContent: 'center', width: minTouch },
})
