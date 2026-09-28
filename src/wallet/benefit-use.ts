import type { Wallet } from './types'

/** A benefit with no uses left, and the use that spent it. */
export interface SpentBenefit {
  title: string
  place: string
  /** The latest use, as the wallet carries it; null only from a server that does not send it. */
  latest: { receiptCode: string; redeemedAt: string } | null
  /** The city's clock, on which the time of use is read. */
  timeZone: string
}

/**
 * Why a benefit cannot be presented, when the reason is that it was used.
 *
 * The wallet marks a benefit whose uses ran out `redeemed` and carries its
 * latest receipt, so right after the partner confirms, the poll of the
 * presentation screen brings the use with it: no extra request, nothing
 * guessed. Every other reason (a hold, an expired or revoked access, a paused
 * offer) is not a use, and answers null.
 */
export function spentBenefit(
  wallet: Wallet,
  accessId: number,
  offerId: number
): SpentBenefit | null {
  const pass = wallet.passes.find((item) => item.access.id === accessId)
  const benefit = pass?.benefits.find((item) => item.offer_id === offerId)
  if (!pass || !benefit || benefit.availability !== 'redeemed') return null
  const latest = benefit.latest_redemption
  return {
    title: benefit.title,
    place: benefit.establishment.public_name,
    latest: latest ? { receiptCode: latest.receipt_code, redeemedAt: latest.redeemed_at } : null,
    timeZone: pass.edition.city.timezone,
  }
}

/** Every operation of the pilot is in Paraná; the city's own zone wins when it is known. */
const DEFAULT_TIME_ZONE = 'America/Sao_Paulo'

/**
 * "28/09/2026 às 14:32", on the city's clock: the same instant must not read as
 * another day depending on where the phone is. Null for an unreadable instant.
 */
export function usedAt(iso: string, timeZone: string): string | null {
  const value = new Date(iso)
  if (Number.isNaN(value.getTime())) return null
  const format = (options: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', { ...options, timeZone }).format(value)
    } catch {
      // An unknown zone must not cost the time of use.
      return new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: DEFAULT_TIME_ZONE }).format(
        value
      )
    }
  }
  const day = format({ day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = format({ hour: '2-digit', minute: '2-digit' })
  return `${day} às ${time}`
}
