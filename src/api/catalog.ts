import { request } from './client'
import type { components } from './schema'

/**
 * Public discovery. None of these routes require a session, and none of them
 * accepts a tenant: the operation is resolved from the base URL's hostname.
 */

type Schemas = components['schemas']

export type City = Schemas['CatalogCityProjection']
export type CityCategories = Schemas['CatalogCityCategoriesResponse']
export type SearchResult = Schemas['CatalogSearchResult']
export type Filters = Schemas['CatalogFilters']
export type EstablishmentDetail = Schemas['CatalogEstablishmentDetailProjection']

export interface SearchParams {
  q?: string
  category?: string
  openNow?: boolean
  /** Public boolean attribute keys. Conjunctive: every one must be declared. */
  attributes?: string[]
  page?: number
  perPage?: number
  sort?: 'relevance' | 'name' | 'recent'
}

const query = (params: SearchParams): string => {
  const search = new URLSearchParams()

  if (params.q) search.set('q', params.q)
  if (params.category) search.set('category', params.category)
  if (params.openNow) search.set('open_now', 'true')
  if (params.attributes?.length) search.set('attributes', params.attributes.join(','))
  if (params.page && params.page !== 1) search.set('page', String(params.page))
  if (params.perPage) search.set('per_page', String(params.perPage))
  if (params.sort && params.sort !== 'relevance') search.set('sort', params.sort)

  const serialized = search.toString()
  return serialized ? `?${serialized}` : ''
}

export const listCities = () => request<City[]>('/api/v1/catalog/cities')

export const listCategories = (citySlug: string) =>
  request<CityCategories>(`/api/v1/catalog/cities/${citySlug}/categories`)

/** Filter facets actually present in the city, so chips are never hardcoded. */
export const listFilters = (citySlug: string) =>
  request<Filters>(`/api/v1/catalog/cities/${citySlug}/filters`)

/** Feeds both the list and the map: the projection carries coordinates. */
export const searchEstablishments = (citySlug: string, params: SearchParams = {}) =>
  request<SearchResult>(`/api/v1/catalog/cities/${citySlug}/establishments${query(params)}`)

export const getEstablishment = (citySlug: string, establishmentSlug: string) =>
  request<EstablishmentDetail>(
    `/api/v1/catalog/cities/${citySlug}/establishments/${establishmentSlug}`
  )
