import { cityWeekday, formatTime, groupedSchedule, weekdayName, weeklySchedule } from '../opening-hours'

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

describe('city-local current day', () => {
  it('uses the city timezone across a UTC day boundary', () => {
    const at = new Date('2026-09-07T01:30:00Z')
    expect(cityWeekday('America/Sao_Paulo', at)).toBe(0)
    expect(cityWeekday('Asia/Tokyo', at)).toBe(1)
  })

  it('changes at midnight in the city, including Saturday to Sunday', () => {
    expect(cityWeekday('America/Sao_Paulo', new Date('2026-09-06T02:59:59Z'))).toBe(6)
    expect(cityWeekday('America/Sao_Paulo', new Date('2026-09-06T03:00:00Z'))).toBe(0)
  })

  it('honors daylight saving where the city observes it', () => {
    expect(cityWeekday('America/New_York', new Date('2026-07-06T04:30:00Z'))).toBe(1)
    expect(cityWeekday('America/New_York', new Date('2026-01-05T04:30:00Z'))).toBe(0)
  })

  it.each(['', 'Invalid/City'])('does not fall back to the device timezone for %p', (timezone) => {
    expect(cityWeekday(timezone)).toBeNull()
  })
})

describe('habitual weekly schedule', () => {
  it('includes all seven days, leaving absent days explicitly without periods', () => {
    const week = weeklySchedule([])
    expect(week.map((day) => day.name)).toEqual([
      'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado',
    ])
    expect(week.every((day) => day.periods.length === 0)).toBe(true)
  })

  it('keeps multiple intervals in order without mutating the projection', () => {
    const hours = [
      { weekday: 1, opens_at: '18:00:00', closes_at: '22:00:00', spans_next_day: false, sort_order: 1 },
      { weekday: 1, opens_at: '09:00:00', closes_at: '12:00:00', spans_next_day: false, sort_order: 0 },
    ]
    expect(weeklySchedule(hours)[1].periods).toEqual(['09:00 às 12:00', '18:00 às 22:00'])
    expect(hours[0].opens_at).toBe('18:00:00')
  })

  it('does not label Sunday closed when a Saturday interval continues into it', () => {
    const week = weeklySchedule([
      { weekday: 6, opens_at: '20:00:00', closes_at: '02:00:00', spans_next_day: true, sort_order: 0 },
    ])
    expect(week[6].periods).toEqual(['20:00 às 02:00 (dia seguinte)'])
    expect(week[0].periods).toEqual(['Até 02:00 (da véspera)'])
    expect(week[1].periods).toEqual([])
  })

  it('does not carry an interval ending exactly at midnight into the next day', () => {
    const week = weeklySchedule([
      { weekday: 6, opens_at: '20:00:00', closes_at: '00:00:00', spans_next_day: true, sort_order: 0 },
    ])
    expect(week[0].periods).toEqual([])
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

describe('week read as a person says it (audit A9)', () => {
  const day = (weekday: number, opens = '09:00:00', closes = '18:00:00') =>
    ({ weekday, opens_at: opens, closes_at: closes, spans_next_day: false, sort_order: 0 })

  it('collapses seven equal days into "Todos os dias"', () => {
    const every = [0, 1, 2, 3, 4, 5, 6].map((weekday) => day(weekday, '08:00:00', '23:00:00'))
    expect(groupedSchedule(every)).toEqual([
      { weekdays: [1, 2, 3, 4, 5, 6, 0], label: 'Todos os dias', hours: '08:00 às 23:00' },
    ])
    expect(groupedSchedule([], true)).toEqual([
      { weekdays: [1, 2, 3, 4, 5, 6, 0], label: 'Todos os dias', hours: '24 horas' },
    ])
  })

  it('joins only adjacent days, Monday first, and keeps split shifts on one line', () => {
    const hours = [
      ...[1, 2, 3, 4, 5].map((weekday) => day(weekday)),
      day(6, '11:00:00', '15:00:00'),
      { ...day(6, '18:00:00', '23:00:00'), sort_order: 1 },
    ]
    expect(groupedSchedule(hours).map(({ label, hours: text }) => `${label}: ${text}`)).toEqual([
      'Segunda a sexta: 09:00 às 18:00',
      'Sábado: 11:00 às 15:00 e 18:00 às 23:00',
      'Domingo: Fechado',
    ])
    expect(groupedSchedule([day(1), day(3)]).map((group) => group.label)).toEqual([
      'Segunda', 'Terça', 'Quarta', 'Quinta a domingo',
    ])
  })
})
