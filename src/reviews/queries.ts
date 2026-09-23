import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createReview,
  deleteReview,
  deleteReviewPhoto,
  getAuthorRules,
  uploadReviewPhoto,
  type PhotoUpload,
  listEstablishmentReviews,
  listMyReviews,
  reportContent,
  updateReview,
  type CreateReview,
  type ReviewPage,
  type UpdateReview,
} from '@/api/reviews'

export const reviewKeys = {
  establishment: (establishmentId: number, params: ReviewPage) =>
    ['reviews', 'establishment', establishmentId, params] as const,
  mine: (params: ReviewPage) => ['reviews', 'mine', params] as const,
}

/** Public. Renders for a visitor with no session, like the rest of discovery. */
export const useEstablishmentReviews = (establishmentId: number | null, params: ReviewPage = {}) =>
  useQuery({
    queryKey: reviewKeys.establishment(establishmentId ?? 0, params),
    queryFn: () => listEstablishmentReviews(establishmentId as number, params),
    enabled: Boolean(establishmentId),
  })

export const useMyReviews = (params: ReviewPage = {}) =>
  useQuery({ queryKey: reviewKeys.mine(params), queryFn: () => listMyReviews(params) })

/**
 * Writing invalidates both listings: the author's own and the establishment's.
 *
 * The server decides whether what was written is published or held for
 * moderation, so nothing is written into the cache by hand — the refetch is
 * what tells the truth about the status the review ended up with.
 */
const useReviewWrite = <TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>
) => {
  const client = useQueryClient()

  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['reviews'] })
    },
  })
}

export const useCreateReview = () => useReviewWrite((body: CreateReview) => createReview(body))

export const useUpdateReview = (id: number) =>
  useReviewWrite((body: UpdateReview) => updateReview(id, body))

export const useDeleteReview = () => useReviewWrite((id: number) => deleteReview(id))

/** A report changes no listing, so it invalidates nothing; it returns a protocol. */
export const useReportContent = () =>
  useMutation({ retry: false, gcTime: 0, mutationFn: reportContent })

export const useAuthorRules = () =>
  useQuery({ queryKey: ['reviews', 'rules'], queryFn: getAuthorRules, staleTime: 5 * 60_000 })

/**
 * Writes the review, then sends its photos one by one.
 *
 * A photo needs the review to exist, so they cannot travel in one request.
 * When a photo fails after the review was published, the review stays and the
 * result says how many photos did not go: redoing the whole review to retry a
 * picture would be worse than telling the person which part is missing.
 */
export const useCreateReviewWithPhotos = () => {
  const client = useQueryClient()

  return useMutation({
    retry: false,
    gcTime: 0,
    mutationFn: async ({ body, photos }: { body: CreateReview; photos: PhotoUpload[] }) => {
      const review = await createReview(body)
      let failed = 0
      for (const photo of photos) {
        try {
          await uploadReviewPhoto(review.id, photo)
        } catch {
          failed++
        }
      }
      return { review, failed }
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['reviews'] })
    },
  })
}

export const useAddReviewPhoto = (reviewId: number) =>
  useReviewWrite((photo: PhotoUpload) => uploadReviewPhoto(reviewId, photo))

export const useRemoveReviewPhoto = (reviewId: number) =>
  useReviewWrite((photoId: number) => deleteReviewPhoto(reviewId, photoId))
