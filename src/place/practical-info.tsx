import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect, useState, type ReactNode } from 'react'
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native'

import { cityWeekday, groupedSchedule, weekdayName } from '@/catalog/opening-hours'
import type { EstablishmentDetail } from '@/catalog/types'
import { minTouch, radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export interface ContactAction {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
}

/** The city's day, kept current across midnight and a return from the background. */
function useCityToday(timeZone: string) {
  const [now, setNow] = useState(() => new Date())
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
  return cityWeekday(timeZone, now)
}

/**
 * Where, when and how to reach a place, in one card (audit A9): the address,
 * the hours read as a person says them — "Todos os dias, 08:00 às 23:00" —
 * with the whole week one tap away, and every contact as a row.
 */
export function PracticalInfo({
  detail,
  contacts,
}: {
  detail: EstablishmentDetail
  /** The ways in touch not already offered as the page's main action. */
  contacts: ContactAction[]
}) {
  const colors = useColors()
  const { address, city } = detail
  const street = [address.street, address.without_number ? 's/n' : address.number].filter(Boolean).join(', ')

  return (
    <View
      accessibilityLabel="Informações práticas"
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      {street ? (
        <Row icon="location-outline">
          <Text style={[styles.title, { color: colors.foreground }]}>{street}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {[address.district, `${city.name} · ${city.state_code}`].filter(Boolean).join(' · ')}
          </Text>
        </Row>
      ) : null}

      <Hours detail={detail} />

      {contacts.map((contact) => (
        <Pressable
          key={contact.label}
          accessibilityRole="button"
          accessibilityLabel={contact.label}
          onPress={contact.onPress}
          style={({ pressed }) => [
            styles.row,
            styles.contact,
            { backgroundColor: colors.card, borderTopColor: colors.borderSubtle, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Ionicons name={contact.icon} size={22} color={colors.primary} />
          <Text style={[styles.title, styles.grow, { color: colors.foreground }]}>{contact.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
        </Pressable>
      ))}
      {contacts.length === 0 ? (
        <Row icon="call-outline">
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>Sem contato cadastrado</Text>
        </Row>
      ) : null}
    </View>
  )
}

function Hours({ detail }: { detail: EstablishmentDetail }) {
  const colors = useColors()
  const [week, setWeek] = useState(false)
  const today = useCityToday(detail.city.timezone)

  if (detail.availability_type === 'appointment_only') {
    return (
      <Row icon="time-outline">
        <Text style={[styles.title, { color: colors.foreground }]}>Somente com agendamento</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>Combine o horário pelos contatos</Text>
      </Row>
    )
  }

  const groups = groupedSchedule(detail.opening_hours.weekly, detail.availability_type === 'always_open')
  const todays = groups.find((group) => today !== null && group.weekdays.includes(today))
  const inline = (hours: string) => (hours === 'Fechado' ? 'fechado' : hours)
  // One line when the week is uniform; otherwise today's, with the week behind "Semana".
  const summary =
    groups.length === 1
      ? `${groups[0].label}, ${inline(groups[0].hours)}`
      : todays && today !== null
        ? `Hoje, ${weekdayName(today).toLowerCase()}: ${inline(todays.hours)}`
        : null

  return (
    <Row
      icon="time-outline"
      action={
        groups.length > 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={week ? 'Ocultar horários da semana' : 'Ver horários da semana'}
            accessibilityState={{ expanded: week }}
            onPress={() => setWeek((open) => !open)}
            hitSlop={spacing.xs}
            style={styles.link}>
            <Text style={[styles.linkLabel, { color: colors.primary }]}>Semana</Text>
          </Pressable>
        ) : null
      }>
      {summary ? <Text style={[styles.title, { color: colors.foreground }]}>{summary}</Text> : null}
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>Horário local de {detail.city.name}</Text>
      {week || !summary
        ? groups.map((group) => {
            const current = today !== null && group.weekdays.includes(today)
            return (
              <View
                key={group.label}
                testID={`hours-${group.label}`}
                style={[
                  styles.day,
                  current && { backgroundColor: colors.temporalEmphasis, borderColor: colors.temporalEmphasisBorder },
                ]}>
                <Text style={[styles.dayLabel, { color: current ? colors.temporalEmphasisForeground : colors.foreground }]}>
                  {group.label}
                  {current ? ' · Hoje' : ''}
                </Text>
                <Text style={[styles.meta, { color: current ? colors.temporalEmphasisForeground : colors.mutedForeground }]}>
                  {group.hours}
                </Text>
              </View>
            )
          })
        : null}
      {detail.opening_hours.special_days.length > 0 ? (
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          Há horários especiais que podem alterar esta programação. Confirme pelos contatos.
        </Text>
      ) : null}
    </Row>
  )
}

function Row({
  icon,
  children,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap
  children: ReactNode
  action?: ReactNode
}) {
  const colors = useColors()
  return (
    <View style={[styles.row, { borderTopColor: colors.borderSubtle }]}>
      <Ionicons name={icon} size={22} color={colors.primary} style={styles.icon} />
      <View style={[styles.grow, styles.copy]}>{children}</View>
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },
  // Rows are divided by a hairline on top; the card's own edge closes the first.
  row: {
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 14,
    marginTop: -StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  contact: { alignItems: 'center', minHeight: 56, paddingVertical: spacing.sm },
  icon: { marginTop: 1 },
  grow: { flex: 1 },
  copy: { gap: 2 },
  title: { ...typography.label, ...textWeight('700') },
  meta: typography.meta,
  link: { alignSelf: 'center', justifyContent: 'center', minHeight: minTouch },
  linkLabel: { ...typography.meta, ...textWeight('700') },
  day: {
    borderColor: 'transparent',
    borderLeftWidth: 3,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  dayLabel: { ...typography.meta, ...textWeight('600'), flexShrink: 1 },
})
