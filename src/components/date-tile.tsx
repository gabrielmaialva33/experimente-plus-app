import { StyleSheet, Text, View } from 'react-native'

import { radius, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

function parts(iso: string, timeZone: string | null) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const zone = timeZone ? { timeZone } : {}
  const read = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('pt-BR', { ...options, ...zone }).format(date)
  return {
    weekday: read({ weekday: 'short' }).replace('.', '').slice(0, 3).toUpperCase(),
    day: read({ day: '2-digit' }),
    month: read({ month: 'short' }).replace('.', ''),
    full: read({ weekday: 'long', day: 'numeric', month: 'long' }),
  }
}

/**
 * A calendar block for an event without a photo (audit A38): the date is the
 * picture. Read in the city's time zone, like every other agenda label.
 */
export function DateTile({
  iso,
  timeZone,
  tone = 'strong',
}: {
  iso: string
  timeZone: string | null
  tone?: 'strong' | 'soft'
}) {
  const colors = useColors()
  const value = parts(iso, timeZone)
  if (!value) return null
  const appearance =
    tone === 'strong'
      ? { background: colors.chrome, foreground: colors.chromeForeground }
      : { background: colors.primarySoft, foreground: colors.primaryAccent }

  return (
    <View
      testID="date-tile"
      accessible
      accessibilityLabel={value.full}
      style={[styles.tile, { backgroundColor: appearance.background }]}>
      <Text style={[styles.weekday, { color: appearance.foreground }]}>{value.weekday}</Text>
      <Text style={[styles.day, { color: appearance.foreground }]}>{value.day}</Text>
      <Text style={[styles.month, { color: appearance.foreground }]}>{value.month}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', borderRadius: radius.thumb, flexShrink: 0, height: 72, justifyContent: 'center', width: 64 },
  weekday: { ...typography.overline, letterSpacing: 0.7 },
  day: { ...typography.title, fontSize: 26, lineHeight: 28 },
  month: { ...typography.caption },
})

