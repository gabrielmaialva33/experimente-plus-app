import { formatTime, weekdayName } from '../opening-hours'

describe('formatTime', () => {
  it('drops the seconds the projection carries', () => {
    expect(formatTime('12:00:00')).toBe('12:00')
    expect(formatTime('23:59:00')).toBe('23:59')
    expect(formatTime('02:30:45')).toBe('02:30')
  })

  it('accepts a value that already has no seconds', () => {
    expect(formatTime('18:00')).toBe('18:00')
  })

  it('passes anything unexpected through instead of mangling it', () => {
    expect(formatTime('sob consulta')).toBe('sob consulta')
    expect(formatTime('')).toBe('')
  })
})

describe('weekdayName', () => {
  it('maps the Postgres day-of-week, which starts on Sunday', () => {
    expect(weekdayName(0)).toBe('Domingo')
    expect(weekdayName(5)).toBe('Sexta')
    expect(weekdayName(6)).toBe('Sábado')
  })

  it('returns empty for an out-of-range day instead of undefined', () => {
    expect(weekdayName(7)).toBe('')
    expect(weekdayName(-1)).toBe('')
  })
})
