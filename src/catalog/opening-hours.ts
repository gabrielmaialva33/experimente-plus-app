import type { Hour } from './types'

/**
 * The projection returns `HH:MM:SS`; seconds are noise in opening hours and
 * nobody reads them. Anything that is not the expected shape is passed through
 * untouched rather than mangled.
 */
export const formatTime = (value: string): string => {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value.trim())
  return match ? `${match[1]}:${match[2]}` : value
}

export const WEEKDAYS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const

/** Postgres `extract(dow …)` is 0-based on Sunday, which this mirrors. */
export const weekdayName = (weekday: number): string => WEEKDAYS[weekday] ?? ''

/** Only the calendar anchor is local; the server owns is_open_now. */
export function cityWeekday(timezone: string, at = new Date()): number | null {
  if (!timezone) return null
  try {
    const day = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(at)
    const index = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day)
    return index < 0 ? null : index
  } catch {
    // Never silently substitute the device timezone for missing/invalid data.
    return null
  }
}

export function weeklySchedule(hours: Hour[]) {
  return WEEKDAYS.map((name, weekday) => {
    const previousDay = (weekday + 6) % 7
    const overnight = hours
      .filter((hour) =>
        hour.weekday === previousDay && hour.spans_next_day &&
        !/^00:00(?::00)?$/.test(hour.closes_at)
      )
      .map((hour) => `Até ${formatTime(hour.closes_at)} (da véspera)`)
    const intervals = hours
      .filter((hour) => hour.weekday === weekday)
      .sort((a, b) => a.sort_order - b.sort_order || a.opens_at.localeCompare(b.opens_at))
      .map((hour) =>
        `${formatTime(hour.opens_at)} às ${formatTime(hour.closes_at)}${hour.spans_next_day ? ' (dia seguinte)' : ''}`
      )
    return { weekday, name, periods: [...overnight, ...intervals] }
  })
}

/** Monday first: a week of opening hours is read "segunda a sexta". */
const READING_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

export interface ScheduleGroup {
  weekdays: number[]
  /** "Todos os dias", "Segunda a sexta", "Sábado e domingo", "Terça". */
  label: string
  /** "08:00 às 23:00", "11:00 às 15:00 e 18:00 às 23:00", "24 horas" or "Fechado". */
  hours: string
}

function groupLabel(weekdays: number[]): string {
  if (weekdays.length === 7) return 'Todos os dias'
  const first = weekdayName(weekdays[0])
  const last = weekdayName(weekdays[weekdays.length - 1]).toLowerCase()
  if (weekdays.length === 1) return first
  return weekdays.length === 2 ? `${first} e ${last}` : `${first} a ${last}`
}

/**
 * The week as a person reads it (audit A9): adjacent days with the same hours
 * become one line, so seven identical rows collapse into "Todos os dias".
 * Only adjacent days are joined — "segunda, quarta e sexta" would ask the
 * reader to work out which days are missing.
 */
export function groupedSchedule(hours: Hour[], alwaysOpen = false): ScheduleGroup[] {
  const days = weeklySchedule(hours)
  const groups: ScheduleGroup[] = []
  for (const weekday of READING_ORDER) {
    const { periods } = days[weekday]
    const text = alwaysOpen ? '24 horas' : periods.length > 0 ? periods.join(' e ') : 'Fechado'
    const previous = groups[groups.length - 1]
    if (previous && previous.hours === text) previous.weekdays.push(weekday)
    else groups.push({ weekdays: [weekday], label: '', hours: text })
  }
  return groups.map((group) => ({ ...group, label: groupLabel(group.weekdays) }))
}
