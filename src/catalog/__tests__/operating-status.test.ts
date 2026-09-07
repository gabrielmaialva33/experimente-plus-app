import { operatingStatus } from '../operating-status'

describe('server-projected operating status', () => {
  it('shows current opening without evaluating any local schedule', () => {
    expect(operatingStatus({ business_status: 'open', is_open_now: true })).toEqual({
      label: 'Aberto agora', tone: 'success',
    })
  })

  it('does not confuse a false search projection with a business closure', () => {
    expect(operatingStatus({ business_status: 'open', is_open_now: false })).toEqual({
      label: 'Consulte o atendimento', tone: 'muted',
    })
  })

  it.each([false, true])('prioritizes appointment-only availability over is_open_now=%s', (is_open_now) => {
    expect(operatingStatus({
      business_status: 'open', is_open_now, availability_type: 'appointment_only',
    })).toEqual({ label: 'Somente com agendamento', tone: 'info' })
  })

  it.each([false, true])('gives temporary closure precedence over is_open_now=%s', (is_open_now) => {
    expect(operatingStatus({ business_status: 'temporarily_closed', is_open_now, availability_type: 'appointment_only' })).toEqual({
      label: 'Fechado temporariamente', tone: 'warning',
    })
  })

  it('gives permanent closure precedence over an inconsistent opening flag', () => {
    expect(operatingStatus({ business_status: 'permanently_closed', is_open_now: true, availability_type: 'appointment_only' })).toEqual({
      label: 'Encerrado permanentemente', tone: 'muted',
    })
  })

  it.each(['regular_hours', 'always_open'] as const)('shows normal closure for known %s availability', (availability_type) => {
    expect(operatingStatus({
      business_status: 'open', is_open_now: false, availability_type,
    })).toEqual({ label: 'Fechado agora', tone: 'muted' })
  })
})
