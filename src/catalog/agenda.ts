import type {
  CityAgendaEventItem,
  CityAgendaExperienceItem,
  CityAgendaResponse,
  DiscoveryCover,
} from '@/api/agenda'

/**
 * View data for the city agenda.
 *
 * The bands arrive resolved: this module renames fields, drops an entry that
 * cannot be opened and formats labels. It never sorts, never filters by date and
 * never asks the device what day it is.
 */
export interface AgendaCoverView {
  url: string
  altText: string
}

interface AgendaItemBaseView {
  id: number
  title: string
  description: string | null
  cover: AgendaCoverView | null
  establishmentName: string
  /** Public identity of the destination, together with `citySlug`. */
  establishmentSlug: string
  citySlug: string
}

export interface AgendaEventView extends AgendaItemBaseView {
  kind: 'event'
  startsAt: string
  endsAt: string | null
}

export interface AgendaExperienceView extends AgendaItemBaseView {
  kind: 'experience'
  publishedAt: string | null
}

export type AgendaItemView = AgendaEventView | AgendaExperienceView

export interface CityAgendaView {
  city: { slug: string; name: string | null; stateCode: string | null; timeZone: string | null }
  /** The city's local day the server computed the windows for. */
  localDate: string | null
  happeningToday: AgendaEventView[]
  upcoming: AgendaEventView[]
  newExperiences: AgendaExperienceView[]
  isEmpty: boolean
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function coverView(cover: DiscoveryCover | null | undefined): AgendaCoverView | null {
  const url = optionalString(cover?.url)
  const altText = optionalString(cover?.alt_text)
  // Alt text is part of the approved media, so an image without it is not
  // renderable; the card falls back to its text instead of a blind image.
  if (!url || !altText) return null
  return { url, altText }
}

function base(item: CityAgendaEventItem | CityAgendaExperienceItem): AgendaItemBaseView | null {
  const title = optionalString(item.title)
  const establishmentSlug = optionalString(item.establishment?.slug)
  const citySlug = optionalString(item.city_slug)
  // Without the public identity pair the card has nowhere to go, and navigating
  // by numeric id is not a public contract.
  if (!title || !establishmentSlug || !citySlug || typeof item.id !== 'number') return null

  return {
    id: item.id,
    title,
    description: optionalString(item.description),
    cover: coverView(item.cover),
    establishmentName: optionalString(item.establishment?.name) ?? '',
    establishmentSlug,
    citySlug,
  }
}

function eventView(item: CityAgendaEventItem): AgendaEventView[] {
  const shared = base(item)
  const startsAt = optionalString(item.starts_at)
  if (!shared || !startsAt) return []
  return [{ ...shared, kind: 'event', startsAt, endsAt: optionalString(item.ends_at) }]
}

function experienceView(item: CityAgendaExperienceItem): AgendaExperienceView[] {
  const shared = base(item)
  if (!shared) return []
  return [{ ...shared, kind: 'experience', publishedAt: optionalString(item.published_at) }]
}

export function cityAgendaView(response: CityAgendaResponse): CityAgendaView {
  const happeningToday = (response.happening_today ?? []).flatMap(eventView)
  const upcoming = (response.upcoming ?? []).flatMap(eventView)
  const newExperiences = (response.new_experiences ?? []).flatMap(experienceView)

  return {
    city: {
      slug: optionalString(response.city?.slug) ?? '',
      name: optionalString(response.city?.name),
      stateCode: optionalString(response.city?.state_code),
      timeZone: optionalString(response.city?.timezone),
    },
    localDate: optionalString(response.local_date),
    happeningToday,
    upcoming,
    newExperiences,
    isEmpty:
      happeningToday.length === 0 && upcoming.length === 0 && newExperiences.length === 0,
  }
}

function format(iso: string, timeZone: string | null, options: Intl.DateTimeFormatOptions) {
  const value = new Date(iso)
  if (Number.isNaN(value.getTime())) return null

  try {
    return new Intl.DateTimeFormat('pt-BR', timeZone ? { ...options, timeZone } : options).format(
      value
    )
  } catch {
    // An unknown timezone must not cost the label; the band membership was
    // already decided by the server, so this is formatting only.
    return new Intl.DateTimeFormat('pt-BR', options).format(value)
  }
}

/**
 * Time range of an event, in the city's timezone.
 *
 * `withDate` comes from the band the server put the item in, not from comparing
 * dates here: today's events only need the hour.
 */
export function formatAgendaWindow(
  item: AgendaEventView,
  timeZone: string | null,
  withDate: boolean
): string | null {
  const time: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  const start = format(item.startsAt, timeZone, withDate ? { ...time, day: '2-digit', month: 'short' } : time)
  if (!start) return null

  const end = item.endsAt ? format(item.endsAt, timeZone, time) : null
  return end ? `${start}–${end}` : start
}

/** Chronological label of a recently published experience. */
export function formatAgendaPublication(iso: string | null, timeZone: string | null): string | null {
  if (!iso) return null
  const published = format(iso, timeZone, { day: '2-digit', month: 'short' })
  return published ? `Publicado em ${published}` : null
}
