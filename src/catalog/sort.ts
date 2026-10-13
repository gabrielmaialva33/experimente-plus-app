import { useCallback, useEffect, useRef, useState } from 'react'

import type { CatalogSort, Origin } from '@/api/catalog'
import { announce } from '@/components/announce'

import { locateForNearest, type LocationProblem } from './location'

/** The orders Explorar offers; the API has two more the app does not show. */
export type ExploreSort = Extract<CatalogSort, 'relevance' | 'rating' | 'distance' | 'price'>

export const SORT_OPTIONS: readonly { value: ExploreSort; label: string }[] = [
  { value: 'relevance', label: 'Relevância' },
  { value: 'rating', label: 'Mais bem avaliados' },
  { value: 'distance', label: 'Mais perto' },
  { value: 'price', label: 'Menor preço' },
]

/** What the list says when "Mais perto" cannot run; it then stays in relevance. */
export const LOCATION_MESSAGES: Record<LocationProblem, string> = {
  denied: 'Sem permissão para usar sua localização. A lista segue por relevância.',
  blocked: 'A localização está bloqueada para o Experimente+. A lista segue por relevância.',
  off: 'A localização do aparelho está desligada. A lista segue por relevância.',
  unavailable: 'Não foi possível descobrir onde você está agora. A lista segue por relevância.',
}

export const LOCATING_MESSAGE = 'Procurando sua localização…'

export interface ExploreSortState {
  sort: ExploreSort
  /** The position of a nearest-first search, in memory while that order is chosen. */
  origin: Origin | null
  locating: boolean
  problem: LocationProblem | null
  choose: (next: ExploreSort) => Promise<void>
}

/**
 * The order of Explorar, shared by the list and the map.
 *
 * "Mais perto" asks for the position only when it is picked. The position lives
 * here, in memory, while that order is chosen; picking another order, or leaving
 * the screen, drops it. A refusal, a blocked permission, the location switched
 * off or no fix in time leaves the list in relevance and says why.
 */
export function useExploreSort(): ExploreSortState {
  const [sort, setSort] = useState<ExploreSort>('relevance')
  const [origin, setOrigin] = useState<Origin | null>(null)
  const [locating, setLocating] = useState(false)
  const [problem, setProblem] = useState<LocationProblem | null>(null)
  // A late answer never overrides a newer choice, nor reaches an unmounted screen.
  const latest = useRef(0)
  useEffect(() => {
    const attempts = latest
    return () => {
      attempts.current += 1
    }
  }, [])

  const choose = useCallback(async (next: ExploreSort) => {
    const attempt = ++latest.current
    setProblem(null)
    if (next !== 'distance') {
      setLocating(false)
      setOrigin(null)
      setSort(next)
      return
    }

    setLocating(true)
    announce(LOCATING_MESSAGE)
    const outcome = await locateForNearest()
    if (attempt !== latest.current) return

    setLocating(false)
    if (outcome.status === 'granted') {
      setOrigin(outcome.origin)
      setSort('distance')
      announce('Lista ordenada pelos lugares mais perto.')
      return
    }
    setOrigin(null)
    setSort('relevance')
    setProblem(outcome.status)
    announce(LOCATION_MESSAGES[outcome.status])
  }, [])

  return { sort, origin, locating, problem, choose }
}
