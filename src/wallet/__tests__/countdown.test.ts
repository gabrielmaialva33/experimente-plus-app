import { clock, presentationDeadline, secondsLeft, spokenClock } from '../countdown'

const REQUESTED = Date.parse('2026-09-28T12:00:00.000Z')
const at = (offsetMs: number) => new Date(REQUESTED + offsetMs).toISOString()

describe('presentationDeadline', () => {
  it('is the server expires_at when the device clock agrees with the server', () => {
    const deadline = presentationDeadline(
      { expires_at: at(300_000 - 200), expires_in_seconds: 300 },
      REQUESTED
    )
    expect(deadline).toBe(REQUESTED + 300_000 - 200)
  })

  // A phone five minutes behind reads a five-minute code as a ten-minute one.
  it('never shows more than the server granted when the device clock runs behind', () => {
    const deadline = presentationDeadline(
      { expires_at: at(600_000), expires_in_seconds: 300 },
      REQUESTED
    )
    expect(deadline).toBe(REQUESTED + 300_000)
  })

  it('keeps the earlier expires_at when the device clock runs ahead', () => {
    const deadline = presentationDeadline(
      { expires_at: at(60_000), expires_in_seconds: 300 },
      REQUESTED
    )
    expect(deadline).toBe(REQUESTED + 60_000)
  })

  it('falls back to expires_at alone without a usable duration', () => {
    for (const seconds of [undefined, Number.NaN, -1]) {
      expect(
        presentationDeadline(
          { expires_at: at(120_000), expires_in_seconds: seconds as unknown as number },
          REQUESTED
        )
      ).toBe(REQUESTED + 120_000)
    }
  })

  it('treats an unreadable expires_at as already expired', () => {
    const deadline = presentationDeadline(
      { expires_at: 'soon', expires_in_seconds: 300 },
      REQUESTED
    )
    expect(secondsLeft(deadline, REQUESTED)).toBe(0)
  })
})

describe('secondsLeft', () => {
  it('rounds down and stops at zero', () => {
    expect(secondsLeft(REQUESTED + 2_999, REQUESTED)).toBe(2)
    expect(secondsLeft(REQUESTED + 999, REQUESTED)).toBe(0)
    expect(secondsLeft(REQUESTED - 5_000, REQUESTED)).toBe(0)
  })
})

describe('clock', () => {
  it('shows minutes and two-digit seconds', () => {
    expect(clock(300)).toBe('5:00')
    expect(clock(65)).toBe('1:05')
    expect(clock(2)).toBe('0:02')
  })

  it('says a duration a screen reader cannot take for a time of day', () => {
    expect(spokenClock(300)).toBe('5 minutos')
    expect(spokenClock(61)).toBe('1 minuto e 1 segundo')
    expect(spokenClock(125)).toBe('2 minutos e 5 segundos')
    expect(spokenClock(1)).toBe('1 segundo')
    expect(spokenClock(0)).toBe('0 segundos')
  })
})
