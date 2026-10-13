import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { request } from '@/api/client'
import { apiBaseUrl } from '@/api/config'
import type { components } from '@/api/schema'
import { price } from '@/purchases/components'
import { useSession } from '@/session/context'
import type { Wallet } from './types'

/**
 * What the person saved with their benefits: the editions open for use under
 * `current`, each closed edition under `past`. The server derives every number
 * from the uses; the app only words them.
 */
export type Savings = components['schemas']['BenefitSavings']
export type SavingsTotals = Omit<components['schemas']['BenefitSavingsCurrent'], 'editions'>
export type PastSavings = components['schemas']['BenefitSavingsPastEdition']

/** Private surface: the response carries `private, no-store` upstream. */
export const getSavings = (signal?: AbortSignal) =>
  request<Savings>('/api/v1/me/savings', { authenticated: true, sensitive: true, signal })

export const savingsKey = ['wallet', 'savings'] as const

/**
 * Every use the wallet knows of. A new use shows up in the wallet first (the
 * presentation screen polls it while the partner confirms), so the savings read
 * again when this number moves instead of waiting for a pull.
 */
export function walletUses(wallet: Wallet | undefined): number | null {
  if (!wallet) return null
  return wallet.passes.reduce(
    (total, pass) =>
      total + pass.benefits.reduce((uses, benefit) => uses + (benefit.redemption_count ?? 0), 0),
    0
  )
}

/**
 * The savings of the signed-in person. `enabled: false` waits (the wallet is
 * still loading); a number of `uses` reads again whenever it changes, and the
 * numbers already shown stay until the new ones arrive.
 */
export function useSavings({
  enabled = true,
  uses = null,
}: { enabled?: boolean; uses?: number | null } = {}) {
  const { status, context } = useSession()
  const owner = [apiBaseUrl, context?.user.id] as const
  return useQuery({
    queryKey: [...savingsKey, ...owner, uses],
    queryFn: ({ signal }) => getSavings(signal),
    enabled: enabled && status === 'authenticated',
    // Only this person's previous numbers, on this server, stand in while new ones load.
    placeholderData: (previous, query) =>
      query?.queryKey[2] === owner[0] && query?.queryKey[3] === owner[1]
        ? keepPreviousData(previous)
        : undefined,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  })
}

export const hasAnyUse = (savings: Savings) =>
  savings.current.benefits_used > 0 || savings.past.length > 0

const count = (value: number, one: string, many: string) =>
  `${value.toLocaleString('pt-BR')} ${value === 1 ? one : many}`

/**
 * Money as a screen reader should say it: "12 reais e 50 centavos", never
 * "R cifrão 12 vírgula 50".
 */
export function spokenMoney(cents: number): string {
  const whole = Math.floor(cents / 100)
  const rest = Math.round(cents % 100)
  const reais = whole > 0 ? count(whole, 'real', 'reais') : null
  const centavos = rest > 0 ? count(rest, 'centavo', 'centavos') : null
  if (reais && centavos) return `${reais} e ${centavos}`
  return reais ?? centavos ?? '0 reais'
}

export interface Amount {
  /** "cerca de R$ 32,00" */
  text: string
  /** "cerca de 32 reais" */
  spoken: string
  estimated: boolean
}

/**
 * The money of a period: exact when it only adds fixed discounts, "cerca de"
 * as soon as an estimate is part of it, null when no use had a money value.
 */
export function savingsAmount(totals: SavingsTotals): Amount | null {
  const cents = totals.savings_exact_cents + totals.savings_estimated_cents
  if (cents <= 0) return null
  const estimated = totals.savings_estimated_cents > 0
  const prefix = estimated ? 'cerca de ' : ''
  return {
    text: `${prefix}${price(cents, 'BRL')}`,
    spoken: `${prefix}${spokenMoney(cents)}`,
    estimated,
  }
}

/** "Em 2026 você visitou 4 lugares e economizou cerca de R$ 120,00.", written and spoken. */
export function recapSentence(year: number, totals: SavingsTotals) {
  const visited = `Em ${year} você visitou ${count(totals.places_visited, 'lugar', 'lugares')}`
  const amount = savingsAmount(totals)
  if (!amount) {
    const text = `${visited} e usou ${count(totals.benefits_used, 'benefício', 'benefícios')}.`
    return { text, spoken: text }
  }
  return {
    text: `${visited} e economizou ${amount.text}.`,
    spoken: `${visited} e economizou ${amount.spoken}.`,
  }
}

export const placesLabel = (value: number) => count(value, 'lugar visitado', 'lugares visitados')
export const usesLabel = (value: number) => count(value, 'benefício usado', 'benefícios usados')
export const visitsLabel = (value: number) => count(value, 'visita', 'visitas')

/** Why some uses add nothing to the estimate, or null when all of them count. */
export function withoutEstimateNote(totals: SavingsTotals): string | null {
  const uses = totals.uses_without_estimate
  if (uses <= 0) return null
  return `${count(uses, 'uso ficou', 'usos ficaram')} fora da estimativa: o lugar não informa o ticket médio.`
}

/** How the numbers are made, in the same words as the manual. */
export const HOW_WE_COUNT = [
  'Descontos em reais entram pelo valor do desconto.',
  'Descontos em porcentagem são estimados com o ticket médio do lugar, o valor médio por pessoa que ele informa.',
  'Lugares sem ticket médio não entram na estimativa.',
  'Cortesias e “compre um, ganhe outro” contam como uso, sem valor em reais.',
] as const

export const FIRST_USE_MESSAGE = 'Use seu primeiro benefício para começar a contar'
