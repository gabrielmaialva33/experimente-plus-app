/**
 * Wallet view types, mirroring the runtime projections of the benefits domain.
 *
 * The wallet is derived, never materialized per user (ADR-0020): every read
 * reflects the current state of access, offer, edition and schedule, so
 * availability is a server decision the client only renders.
 */

export type Availability =
  | 'available'
  | 'upcoming'
  | 'outside_schedule'
  | 'paused'
  | 'expired'
  | 'revoked'
  | 'redeemed'

export interface WalletBenefit {
  key: string
  access_id: number
  offer_id: number
  availability: Availability
  title: string
  description: string
  benefit_type: string
  terms: string | null
  reservation_required: boolean
  on_premise_only: boolean
  minimum_party_size: number
  max_redemptions_per_access: number
  redemption_count?: number
  remaining_redemptions?: number
  latest_redemption?: { id: string; receipt_code: string; redeemed_at: string } | null
  establishment: { id: number; public_name: string; slug: string | null }
}

export interface WalletPass {
  access: { id: number; status: string; granted_at: string; availability: Availability }
  edition: {
    id: number
    name: string
    slug: string
    description: string | null
    usage_starts_at: string
    usage_ends_at: string
    city: { id: number; name: string; slug: string; state_code: string; timezone: string }
  }
  benefits: WalletBenefit[]
}

export interface Wallet {
  summary: { passes: number; benefits: number; available: number; upcoming: number; redeemed: number }
  passes: WalletPass[]
}

export interface BenefitSummary {
  access_id: number
  offer_id: number
  edition_name: string
  establishment_name: string
  offer_title: string
  offer_description: string
  terms: string | null
  reservation_required: boolean
  on_premise_only: boolean
  minimum_party_size: number
  remaining_redemptions: number
}

/**
 * A five-minute presentation. The QR is rendered by the server and arrives as a
 * data URL, so the client never encodes the token itself — and never extends
 * the deadline locally (ADR-0021).
 */
export interface Presentation {
  token: string
  validation_url: string
  qr_data_url: string
  issued_at: string
  expires_at: string
  expires_in_seconds: number
  benefit: BenefitSummary
}

/** Copy for every non-usable state, so the reason is always explained. */
export const AVAILABILITY_LABEL: Record<Availability, string> = {
  available: 'Disponível',
  upcoming: 'Ainda não começou',
  outside_schedule: 'Fora do horário',
  paused: 'Pausado',
  expired: 'Expirado',
  revoked: 'Revogado',
  redeemed: 'Já utilizado',
}

export interface Preview {
  token: string
  expires_at: string
  holder: { id: number; full_name: string; email: string }
  benefit: BenefitSummary
}

export interface Receipt {
  id: number
  receipt_code: string
  redemption_number: number
  redeemed_at: string
  edition: { id: number; name: string }
  offer: { id: number; title: string; benefit_type: string; terms: string | null }
  establishment: { id: number; name: string }
  holder: { id: number; full_name: string; email: string }
  redeemed_by: number
}

export interface History {
  redemptions: Receipt[]
  total: number
}
