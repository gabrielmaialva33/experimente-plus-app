import type { Wallet, WalletBenefit, WalletPass } from './types'

export const FINANCIAL_RESTRICTION_MESSAGE =
  'Este acesso está indisponível para novos usos. Aguarde a atualização ou procure o suporte da operação.'

export const financiallyBlocked = (value: Pick<WalletPass['access'], 'financially_blocked'>) => value.financially_blocked === true

export const canPresentBenefit = (pass: WalletPass, benefit: WalletBenefit) =>
  !financiallyBlocked(pass.access) &&
  pass.access.status === 'active' && pass.access.availability === 'available' &&
  benefit.availability === 'available'

export function presentationEligibility(wallet: Wallet, accessId: number, offerId: number) {
  const pass = wallet.passes.find((item) => item.access.id === accessId)
  const benefit = pass?.benefits.find((item) => item.offer_id === offerId)
  const blocked = Boolean(pass && financiallyBlocked(pass.access))
  return { blocked, allowed: Boolean(pass && benefit && canPresentBenefit(pass, benefit)) }
}
