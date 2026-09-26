import { File } from 'expo-file-system'

import { request } from './client'
import type { components } from './schema'

/**
 * Reviews (ADR-0027).
 *
 * The public listing needs no session and resolves the operation from the base
 * URL's hostname, like the rest of discovery. Writing needs one, and the tenant
 * comes from the credential — the app never chooses an operation.
 */

type Schemas = components['schemas']

export type Review = Schemas['EstablishmentReview']
export type ReviewAuthor = Schemas['ReviewAuthor']
export type ReviewReply = Schemas['EstablishmentReviewReply']
export type PaginatedReviews = Schemas['PaginatedReviewsResponse']
/** The author's own listing, which says when a rule is holding a review. */
export type PaginatedMyReviews = Schemas['PaginatedMyReviewsResponse']
export type CreateReview = Schemas['CreateReviewRequest']
export type UpdateReview = Schemas['UpdateReviewRequest']
export type ReportReason = Schemas['CreateReportRequest']['reason']
export type ReviewPhoto = Schemas['ReviewPhoto']
export type AuthorRules = Schemas['ReviewAuthorRules']
export type ReportTargetType = Schemas['CreateReportRequest']['target_type']

export interface ReviewPage {
  page?: number
  perPage?: number
  /** Narrows to a single star count; the listing is always newest first. */
  rating?: number
}

const query = (params: ReviewPage): string => {
  const search = new URLSearchParams()
  if (params.page && params.page !== 1) search.set('page', String(params.page))
  if (params.perPage) search.set('per_page', String(params.perPage))
  if (params.rating) search.set('rating', String(params.rating))
  const serialized = search.toString()
  return serialized ? `?${serialized}` : ''
}

export const listEstablishmentReviews = (establishmentId: number, params: ReviewPage = {}) =>
  request<PaginatedReviews>(
    `/api/v1/catalog/establishments/${establishmentId}/reviews${query(params)}`
  )

export const listMyReviews = (params: ReviewPage = {}) =>
  request<PaginatedMyReviews>(`/api/v1/me/reviews${query(params)}`, { authenticated: true })

export const createReview = (body: CreateReview) =>
  request<Review>('/api/v1/me/reviews', { method: 'POST', authenticated: true, body })

export const updateReview = (id: number, body: UpdateReview) =>
  request<Review>(`/api/v1/me/reviews/${id}`, { method: 'PUT', authenticated: true, body })

export const deleteReview = (id: number) =>
  request<void>(`/api/v1/me/reviews/${id}`, { method: 'DELETE', authenticated: true })

/**
 * A report is a private act. It is sent authenticated and its response carries
 * the protocol the person quotes to follow the case up.
 */
/**
 * A report without an account (ADR-0027 scenarios 13 and 14). Public, like the
 * catalogue: the base URL's hostname selects the operation. The answer is the
 * protocol alone.
 */
export const reportAnonymously = (body: Schemas['CreateAnonymousReportRequest']) =>
  request<Schemas['AnonymousReportReceipt']>('/api/v1/catalog/content-reports', {
    method: 'POST',
    sensitive: true,
    body,
  })

export const reportContent = (body: {
  target_type: ReportTargetType
  target_id: number
  reason: ReportReason
  details?: string
}) =>
  request<Schemas['ContentReport']>('/api/v1/content-reports', {
    method: 'POST',
    authenticated: true,
    sensitive: true,
    body,
  })

/** The rules of this operation, read instead of hard-coded (ADR-0027 scenario 10). */
export const getAuthorRules = () =>
  request<AuthorRules>('/api/v1/me/reviews/rules', { authenticated: true })

export interface PhotoUpload {
  uri: string
  fileName: string
  mimeType: string
}

/**
 * Sends one photo. The server strips its location and device metadata before
 * storing it, so nothing here has to — and nothing here could guarantee it.
 */
export const uploadReviewPhoto = (reviewId: number, photo: PhotoUpload, altText?: string | null) => {
  const form = new FormData()
  // Expo's runtime installs expo/fetch as the global fetch, and it only sends
  // Blob parts: React Native's { uri, name, type } object fails on the device
  // before any request leaves. A File from expo-file-system is the Blob it reads.
  form.append('photo', new File(photo.uri), photo.fileName)
  if (altText?.trim()) form.append('alt_text', altText.trim())

  return request<ReviewPhoto>(`/api/v1/me/reviews/${reviewId}/photos`, {
    method: 'POST',
    authenticated: true,
    body: form,
  })
}

export const deleteReviewPhoto = (reviewId: number, photoId: number) =>
  request<void>(`/api/v1/me/reviews/${reviewId}/photos/${photoId}`, {
    method: 'DELETE',
    authenticated: true,
  })
