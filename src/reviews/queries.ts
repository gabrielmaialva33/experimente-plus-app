import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createReview,
  deleteReview,
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
