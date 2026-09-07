import type { EstablishmentDetail, EstablishmentSummary } from './types'

type Status = Pick<EstablishmentSummary, 'business_status' | 'is_open_now'> &
  Partial<Pick<EstablishmentDetail, 'availability_type'>>

/** Mirrors docs/design/catalog_tokens.md in the backend; never evaluates hours. */
export function operatingStatus(establishment: Status): {
  label: string
  tone: 'success' | 'warning' | 'muted' | 'info'
} {
  if (establishment.business_status === 'permanently_closed') {
    return { label: 'Encerrado permanentemente', tone: 'muted' }
  }
  if (establishment.business_status === 'temporarily_closed') {
    return { label: 'Fechado temporariamente', tone: 'warning' }
  }
  if (establishment.availability_type === 'appointment_only') {
    return { label: 'Somente com agendamento', tone: 'info' }
  }
  if (establishment.is_open_now) {
    return { label: 'Aberto agora', tone: 'success' }
  }

  // Search items omit availability_type. False can also mean appointment-only.
  return {
    label: establishment.availability_type ? 'Fechado agora' : 'Consulte o atendimento',
    tone: 'muted',
  }
}
