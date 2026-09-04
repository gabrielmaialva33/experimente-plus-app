import { useQuery } from '@tanstack/react-query'

import {
  getEstablishment,
  listCategories,
  listCities,
  listFilters,
  searchEstablishments,
  type SearchParams,
} from '@/api/catalog'
import type { EstablishmentPage, EstablishmentSummary } from './types'

/** Public discovery needs no session, so these queries never carry a token. */
export const catalogKeys = {
  cities: ['catalog', 'cities'] as const,
  categories: (city: string) => ['catalog', 'categories', city] as const,
  filters: (city: string) => ['catalog', 'filters', city] as const,
  search: (city: string, params: SearchParams) => ['catalog', 'search', city, params] as const,
  establishment: (city: string, slug: string) => ['catalog', 'establishment', city, slug] as const,
}

export const useCities = () => useQuery({ queryKey: catalogKeys.cities, queryFn: listCities })

export const useCategories = (citySlug: string | null) =>
  useQuery({
    queryKey: catalogKeys.categories(citySlug ?? ''),
    queryFn: () => listCategories(citySlug as string),
    enabled: Boolean(citySlug),
  })

export const useFilters = (citySlug: string | null) =>
  useQuery({
    queryKey: catalogKeys.filters(citySlug ?? ''),
    queryFn: () => listFilters(citySlug as string),
    enabled: Boolean(citySlug),
  })

export const useSearch = (citySlug: string | null, params: SearchParams) =>
  useQuery({
    queryKey: catalogKeys.search(citySlug ?? '', params),
    queryFn: async () => {
      const result = await searchEstablishments(citySlug as string, params)
      return {
        ...result,
        // The generated types leave the nested projection untyped; the runtime
        // shape is described in `./types`.
        organic: result.organic_results as unknown as EstablishmentSummary[],
        sponsored: result.sponsored_results as unknown as EstablishmentSummary[],
      }
    },
    enabled: Boolean(citySlug),
  })

export const useEstablishment = (citySlug: string | null, slug: string | null) =>
  useQuery({
    queryKey: catalogKeys.establishment(citySlug ?? '', slug ?? ''),
    queryFn: async () =>
      (await getEstablishment(citySlug as string, slug as string)) as unknown as EstablishmentPage,
    enabled: Boolean(citySlug && slug),
  })
