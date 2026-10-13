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

export type CatalogSort = Schemas['CatalogSearchQuery']['sort']

/** Where the person is, for the nearest-first order only. */
export interface Origin {
  latitude: number
  longitude: number
}

export interface SearchParams {
  q?: string
  category?: string
  openNow?: boolean
  /** "Vale hoje": only places with a benefit still usable today. */
  benefitToday?: boolean
  /** Public boolean attribute keys. Conjunctive: every one must be declared. */
  attributes?: string[]
  page?: number
  perPage?: number
  sort?: CatalogSort
  /**
   * Read for `sort: 'distance'` only, and sent in that request alone: the server
   * neither caches, logs nor echoes it, and the request skips every cache here.
   */
  origin?: Origin
}

/** Nearest first needs a position; without one the request asks for the default order. */
const nearest = (params: SearchParams) =>
  params.sort === 'distance' && params.origin ? params.origin : null

const query = (params: SearchParams): string => {
  const search = new URLSearchParams()
  const origin = nearest(params)

  if (params.q) search.set('q', params.q)
  if (params.category) search.set('category', params.category)
  if (params.openNow) search.set('open_now', 'true')
  if (params.benefitToday) search.set('benefit_today', 'true')
  if (params.attributes?.length) search.set('attributes', params.attributes.join(','))
  if (params.page && params.page !== 1) search.set('page', String(params.page))
  if (params.perPage) search.set('per_page', String(params.perPage))
  if (params.sort && params.sort !== 'relevance' && (params.sort !== 'distance' || origin)) {
    search.set('sort', params.sort)
  }
  if (origin) {
    search.set('lat', String(origin.latitude))
    search.set('lng', String(origin.longitude))
  }

  const serialized = search.toString()
  return serialized ? `?${serialized}` : ''
}

/**
 * A slug as one path segment. Slugs reach here from routes, and so from deep
 * links: encoded, a `/`, `..` or `?` in one stays inside its segment instead of
 * steering the request to another path of the API.
 */
const segment = encodeURIComponent

export const listCities = () => request<City[]>('/api/v1/catalog/cities')

export const listCategories = (citySlug: string) =>
  request<CityCategories>(`/api/v1/catalog/cities/${segment(citySlug)}/categories`)

/** Filter facets actually present in the city, so chips are never hardcoded. */
export const listFilters = (citySlug: string) =>
  request<Filters>(`/api/v1/catalog/cities/${segment(citySlug)}/filters`)

/** Feeds both the list and the map: the projection carries coordinates. */
export const searchEstablishments = (citySlug: string, params: SearchParams = {}) =>
  request<SearchResult>(
    `/api/v1/catalog/cities/${segment(citySlug)}/establishments${query(params)}`,
    // A URL with someone's position stays out of every HTTP cache on the device.
    nearest(params) ? { sensitive: true } : undefined
  )

export const getEstablishment = (citySlug: string, establishmentSlug: string) =>
  request<EstablishmentDetail>(
    `/api/v1/catalog/cities/${segment(citySlug)}/establishments/${segment(establishmentSlug)}`
  )
