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
