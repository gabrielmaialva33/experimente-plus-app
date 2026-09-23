import { publicRequest } from './public'

/**
 * City agenda for public discovery.
 *
 * The server resolves every window in the city's own timezone, orders the bands
 * deterministically, keeps only approved media, only discoverable
 * establishments and only text from the approved snapshot. `local_date` and
 * `city.timezone` exist so the client can label and format what it received —
 * never to decide again whether something belongs to today on the device's
 * clock.
 *
 * Canonical schemas pending `pnpm api:types`:
 * `components['schemas']['CityAgendaResponse']`, `['CityAgendaEventItem']`,
 * `['CityAgendaExperienceItem']` and `['DiscoveryCover']`.
 */
export interface DiscoveryCover {
  url: string
  alt_text: string
  width: number | null
  height: number | null
}

/** Public identity of a place: the city slug plus the establishment slug. */
export interface AgendaEstablishmentRef {
  slug: string
  name: string
}

export interface CityAgendaEventItem {
  id: number
  kind: 'event'
  title: string
  description: string | null
  starts_at: string
  ends_at: string
  cover: DiscoveryCover | null
  establishment: AgendaEstablishmentRef
  city_slug: string
}

export interface CityAgendaExperienceItem {
  id: number
  kind: 'experience'
  title: string
  description: string | null
  published_at: string
  cover: DiscoveryCover | null
  establishment: AgendaEstablishmentRef
  city_slug: string
}

export interface CityAgendaCity {
  slug: string
  name: string
  state_code: string
  timezone: string
}

export interface CityAgendaResponse {
  city: CityAgendaCity
  /** Local day of the city the windows were computed for, `YYYY-MM-DD`. */
  local_date: string
  happening_today: CityAgendaEventItem[]
  upcoming: CityAgendaEventItem[]
  /** Chronological by `published_at desc`. There is no prominence contract. */
  new_experiences: CityAgendaExperienceItem[]
}

/** One request per city: the whole agenda arrives together, with no waterfall. */
export const getCityAgenda = (citySlug: string) =>
  publicRequest<CityAgendaResponse>(`/api/v1/catalog/cities/${citySlug}/agenda`)
