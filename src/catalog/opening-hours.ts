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
