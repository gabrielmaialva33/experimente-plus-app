/**
 * View types for the catalog projection.
 *
 * `docs/openapi.yaml` declares the nested objects of `CatalogSearchItem` — city,
 * address, cover, categories — as bare `object`, so the generated schema types
 * them as `unknown`. These mirror the runtime shape emitted by
 * `CatalogService.searchItem`, which is authoritative until the spec is
 * tightened.
 *
 * Two divergences worth keeping in mind:
 *   - the image URL lives at `cover.asset.url`, not `cover.url` as the spec's
 *     unused `CatalogCover` schema suggests;
 *   - the projection drops any establishment without cover media, so an empty
 *     list can mean "no media" rather than "no match".
 */

export interface MediaAsset {
  url: string
  mime_type: string
  file_extension: string
  width: number
  height: number
}

export interface Media {
  purpose: string
  is_cover: boolean
  sort_order: number
  alt_text: string
  caption: string | null
  asset: MediaAsset
}

export interface CategoryRef {
  slug: string
  name: string
  description: string | null
  icon: string | null
  family: { slug: string; name: string; icon: string | null }
  is_primary: boolean
  sort_order: number
}

export interface EstablishmentSummary {
  slug: string
  name: string
  short_description: string | null
  city: { slug: string; name: string; state_code: string }
  address: { district: string | null; latitude: number | null; longitude: number | null }
  business_status: 'open' | 'temporarily_closed' | 'permanently_closed'
  is_open_now: boolean
  primary_category: CategoryRef | null
  categories: CategoryRef[]
  cover: Media
  is_sponsored: boolean
  published_at: string
  updated_at: string
}

export interface Address {
  postal_code: string | null
  street: string | null
  number: string | null
  without_number: boolean
  complement: string | null
  district: string | null
  reference: string | null
  latitude: number | null
  longitude: number | null
}

export interface Attribute {
  key: string
  name: string
  description: string | null
  type: string
  unit: string | null
  value: string | number | boolean | null
  options: { label: string; value: string }[]
}

export interface Hour {
  weekday: number
  opens_at: string
  closes_at: string
  spans_next_day: boolean
  sort_order: number
}

export interface EstablishmentDetail {
  slug: string
  name: string
  short_description: string | null
  description: string | null
  city: { slug: string; name: string; state_code: string; timezone: string }
  address: Address
  contacts: {
    phone: string | null
    whatsapp: string | null
    email: string | null
    website: string | null
    instagram: string | null
    booking_url: string | null
  }
  business_status: 'open' | 'temporarily_closed' | 'permanently_closed'
  availability_type: 'regular_hours' | 'appointment_only' | 'always_open'
  is_open_now: boolean
  categories: CategoryRef[]
  attributes: Attribute[]
  opening_hours: { weekly: Hour[]; special_days: unknown[] }
  media: Media[]
  cover: Media
  is_sponsored: boolean
  published_at: string
  updated_at: string
}

/**
 * A permanently closed unit is served as a minimal historical page rather than
 * a full listing, so the detail response is a discriminated union.
 */
export interface EstablishmentHistorical {
  slug: string
  name: string
  city: { slug: string; name: string; state_code: string }
  business_status: 'permanently_closed'
  historical: true
  message: string
  published_at: string
  updated_at: string
}

export type EstablishmentPage = EstablishmentDetail | EstablishmentHistorical

export const isHistorical = (page: EstablishmentPage): page is EstablishmentHistorical =>
  'historical' in page && page.historical === true
