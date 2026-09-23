import { request } from './client'
import type { components } from './schema'

/**
 * The Explorer's own layer (ADR-0030, Anexo I item 10).
 *
 * Every call is authenticated and every answer is the caller's own data. The
 * tenant comes from the credential, as it does for the rest of `/api/v1/me`:
 * the app never chooses an operation.
 */

type Schemas = components['schemas']

export type EstablishmentCard = Schemas['ExplorerEstablishmentCard']
export type SavedList = Schemas['ExplorerSavedList']
export type SavedStatus = Schemas['ExplorerSavedStatus']
export type Interest = Schemas['ExplorerInterest']
export type Itinerary = Schemas['ExplorerItinerary']
export type ItineraryStop = Schemas['ExplorerItineraryStop']
export type ItinerarySummary = Schemas['ExplorerItinerarySummary']
export type ItineraryInput = Schemas['ExplorerItineraryRequest']

export type SavedKind = 'favorites' | 'follows'

export type SavedContent = Schemas['ExplorerSavedContent']
export type SavedContentList = Schemas['ExplorerSavedContentList']
/** Experiences and events. Showcase items cannot be favourited (ADR-0030). */
export type FavoriteContentPath = 'experiences' | 'events'

export const listSaved = (kind: SavedKind) =>
  request<SavedList>(`/api/v1/me/${kind}`, { authenticated: true })

/** Idempotent on the server: a retry after a lost response is harmless. */
export const saveEstablishment = (kind: SavedKind, establishmentId: number) =>
  request<SavedStatus>(`/api/v1/me/${kind}/${establishmentId}`, {
    method: 'PUT',
    authenticated: true,
  })

export const unsaveEstablishment = (kind: SavedKind, establishmentId: number) =>
  request<SavedStatus>(`/api/v1/me/${kind}/${establishmentId}`, {
    method: 'DELETE',
    authenticated: true,
  })

export const savedStatus = (establishmentId: number) =>
  request<SavedStatus>(`/api/v1/me/saved/${establishmentId}`, { authenticated: true })

export const listInterests = () =>
  request<{ data: Interest[] }>('/api/v1/me/interests', { authenticated: true })

/** By slug: the catalogue never publishes a category's numeric id. */
export const replaceInterests = (categorySlugs: string[]) =>
  request<{ data: Interest[] }>('/api/v1/me/interests', {
    method: 'PUT',
    authenticated: true,
    body: { category_slugs: categorySlugs },
  })

export const listItineraries = () =>
  request<{ data: ItinerarySummary[] }>('/api/v1/me/itineraries', { authenticated: true })

export const getItinerary = (id: number) =>
  request<Itinerary>(`/api/v1/me/itineraries/${id}`, { authenticated: true })

export const createItinerary = (body: ItineraryInput) =>
  request<Itinerary>('/api/v1/me/itineraries', { method: 'POST', authenticated: true, body })

export const updateItinerary = (id: number, body: ItineraryInput) =>
  request<Itinerary>(`/api/v1/me/itineraries/${id}`, {
    method: 'PUT',
    authenticated: true,
    body,
  })

export const deleteItinerary = (id: number) =>
  request<void>(`/api/v1/me/itineraries/${id}`, { method: 'DELETE', authenticated: true })

export const addItineraryStop = (id: number, establishmentId: number, note?: string | null) =>
  request<Itinerary>(`/api/v1/me/itineraries/${id}/stops`, {
    method: 'POST',
    authenticated: true,
    body: { establishment_id: establishmentId, note: note ?? null },
  })

export const removeItineraryStop = (id: number, stopId: number) =>
  request<Itinerary>(`/api/v1/me/itineraries/${id}/stops/${stopId}`, {
    method: 'DELETE',
    authenticated: true,
  })

/** The whole sequence: the server refuses a partial order rather than guess. */
export const reorderItineraryStops = (id: number, stopIds: number[]) =>
  request<Itinerary>(`/api/v1/me/itineraries/${id}/stops/order`, {
    method: 'PUT',
    authenticated: true,
    body: { stop_ids: stopIds },
  })

export const listSavedContent = () =>
  request<SavedContentList>('/api/v1/me/favorites/content', { authenticated: true })

/** Idempotent; content that is not public now answers 404. */
export const saveContent = (kind: FavoriteContentPath, contentId: number) =>
  request<{ favorited: boolean }>(`/api/v1/me/favorites/content/${kind}/${contentId}`, {
    method: 'PUT',
    authenticated: true,
  })

export const unsaveContent = (kind: FavoriteContentPath, contentId: number) =>
  request<{ favorited: boolean }>(`/api/v1/me/favorites/content/${kind}/${contentId}`, {
    method: 'DELETE',
    authenticated: true,
  })
