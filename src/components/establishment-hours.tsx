import { useEffect, useState } from 'react'
import { AppState, StyleSheet, Text, View } from 'react-native'

import { cityWeekday, weeklySchedule } from '@/catalog/opening-hours'
import type { EstablishmentDetail } from '@/catalog/types'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export function EstablishmentHours({ establishment }: { establishment: EstablishmentDetail }) {
  const colors = useColors()
  const [now, setNow] = useState(() => new Date())
  const today = cityWeekday(establishment.city.timezone, now)

  useEffect(() => {
    const update = () => setNow(new Date())
    const timer = setInterval(update, 60_000)
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') update()
    })
    return () => {
      clearInterval(timer)
      listener.remove()
    }
  }, [])

  return (
    <View style={[styles.section, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
      <Text style={[styles.heading, { color: colors.foreground }]}>Horários habituais</Text>
      <Text style={[styles.caption, { color: colors.mutedForeground }]}>
        Horário local de {establishment.city.name}
      </Text>
      {establishment.availability_type === 'appointment_only' ? (
        <Text style={[styles.body, { color: colors.foreground }]}>Somente com agendamento</Text>
      ) : (
        weeklySchedule(establishment.opening_hours.weekly).map((day) => (
          <View
            key={day.weekday}
            style={[styles.day, {
              borderLeftColor: day.weekday === today ? colors.temporalEmphasisBorder : colors.surfaceRaised,
            }, day.weekday === today && { backgroundColor: colors.temporalEmphasis }]}>
            <Text style={[
              styles.body,
              { color: day.weekday === today ? colors.temporalEmphasisForeground : colors.foreground },
              day.weekday === today && styles.today,
            ]}>
              {day.name}{day.weekday === today ? ' · Hoje' : ''}
            </Text>
            <Text style={[styles.body, { color: day.weekday === today ? colors.temporalEmphasisForeground : colors.mutedForeground }]}>
              {establishment.availability_type === 'always_open'
                ? '24 horas'
                : day.periods.length > 0 ? day.periods.join('\n') : 'Fechado'}
            </Text>
          </View>
        ))
      )}
      {establishment.opening_hours.special_days.length > 0 ? (
        <Text style={[styles.caption, { color: colors.mutedForeground }]}>
          Há horários especiais que podem alterar esta programação. Confirme pelos contatos.
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderWidth: 1, borderRadius: radius.surface },
  heading: typography.heading,
  caption: typography.caption,
  body: typography.body,
  day: { borderRadius: radius.surface, borderLeftWidth: 4, gap: spacing.xs, padding: spacing.sm },
  today: { fontWeight: '700' },
})
