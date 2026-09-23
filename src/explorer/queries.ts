import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addItineraryStop,
  createItinerary,
  deleteItinerary,
  getItinerary,
  listInterests,
  listItineraries,
  listSaved,
  listSavedContent,
  removeItineraryStop,
  reorderItineraryStops,
  replaceInterests,
  savedStatus,
  saveContent,
  saveEstablishment,
  unsaveContent,
  unsaveEstablishment,
  updateItinerary,
  type FavoriteContentPath,
  type ItineraryInput,
  type SavedContentList,
  type SavedKind,
  type SavedStatus,
} from '@/api/explorer'

export const explorerKeys = {
  all: ['explorer'] as const,
  saved: (kind: SavedKind) => ['explorer', 'saved', kind] as const,
  savedContent: ['explorer', 'saved', 'content'] as const,
  status: (establishmentId: number) => ['explorer', 'status', establishmentId] as const,
  interests: ['explorer', 'interests'] as const,
  itineraries: ['explorer', 'itineraries'] as const,
  itinerary: (id: number) => ['explorer', 'itineraries', id] as const,
}

export const useSavedList = (kind: SavedKind) =>
  useQuery({ queryKey: explorerKeys.saved(kind), queryFn: () => listSaved(kind) })

/**
 * Only asked when there is a session. A visitor sees the page without the two
 * buttons' state rather than a request that is guaranteed to answer 401.
 */
export const useSavedStatus = (establishmentId: number | null, signedIn: boolean) =>
  useQuery({
    queryKey: explorerKeys.status(establishmentId ?? 0),
    queryFn: () => savedStatus(establishmentId as number),
    enabled: signedIn && Boolean(establishmentId),
  })

/**
 * Favourite and follow toggle optimistically, because the button is the whole
 * interaction and waiting a round trip to fill a heart reads as broken.
 *
 * The optimistic value is replaced by what the server answers, and rolled back
 * if it fails: the server decides, the cache only anticipates.
 */
export const useToggleSaved = (kind: SavedKind, establishmentId: number) => {
  const client = useQueryClient()
  const key = explorerKeys.status(establishmentId)
  const field: keyof SavedStatus = kind === 'favorites' ? 'favorited' : 'following'

  return useMutation({
    retry: false,
    mutationFn: (save: boolean) =>
      save
        ? saveEstablishment(kind, establishmentId)
        : unsaveEstablishment(kind, establishmentId),
    onMutate: async (save: boolean) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<SavedStatus>(key)
      client.setQueryData<SavedStatus>(key, {
        favorited: previous?.favorited ?? false,
        following: previous?.following ?? false,
        [field]: save,
      })
      return { previous }
    },
    onError: (_error, _save, context) => {
      if (context?.previous) client.setQueryData(key, context.previous)
      else client.removeQueries({ queryKey: key })
    },
    onSuccess: (status) => {
      client.setQueryData(key, status)
      void client.invalidateQueries({ queryKey: explorerKeys.saved(kind) })
    },
  })
}

export const useInterests = () =>
  useQuery({ queryKey: explorerKeys.interests, queryFn: listInterests })

export const useReplaceInterests = () => {
  const client = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: (categorySlugs: string[]) => replaceInterests(categorySlugs),
    onSuccess: (result) => client.setQueryData(explorerKeys.interests, result),
  })
}

export const useItineraries = () =>
  useQuery({ queryKey: explorerKeys.itineraries, queryFn: listItineraries })

export const useItinerary = (id: number | null) =>
  useQuery({
    queryKey: explorerKeys.itinerary(id ?? 0),
    queryFn: () => getItinerary(id as number),
    enabled: Boolean(id),
  })

/**
 * Every itinerary write answers with the whole itinerary, so the detail is set
 * from the response and only the summary list is refetched — its counts and
 * ordering are the server's to compute.
 */
const useItineraryWrite = <TVariables>(
  mutationFn: (variables: TVariables) => Promise<Awaited<ReturnType<typeof getItinerary>>>
) => {
  const client = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn,
    onSuccess: (itinerary) => {
      client.setQueryData(explorerKeys.itinerary(itinerary.id), itinerary)
      void client.invalidateQueries({ queryKey: explorerKeys.itineraries, exact: true })
    },
  })
}

export const useCreateItinerary = () =>
  useItineraryWrite((body: ItineraryInput) => createItinerary(body))

export const useUpdateItinerary = (id: number) =>
  useItineraryWrite((body: ItineraryInput) => updateItinerary(id, body))

export const useAddItineraryStop = () =>
  useItineraryWrite(({ id, establishmentId }: { id: number; establishmentId: number }) =>
    addItineraryStop(id, establishmentId)
  )

export const useRemoveItineraryStop = (id: number) =>
  useItineraryWrite((stopId: number) => removeItineraryStop(id, stopId))

export const useReorderItineraryStops = (id: number) =>
  useItineraryWrite((stopIds: number[]) => reorderItineraryStops(id, stopIds))

export const useDeleteItinerary = () => {
  const client = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: (id: number) => deleteItinerary(id),
    onSuccess: (_result, id) => {
      client.removeQueries({ queryKey: explorerKeys.itinerary(id) })
      void client.invalidateQueries({ queryKey: explorerKeys.itineraries, exact: true })
    },
  })
}

/**
 * Favourited experiences and events. Only asked with a session: a visitor's
 * heart buttons send them to sign in instead.
 */
export const useSavedContent = (signedIn = true) =>
  useQuery({
    queryKey: explorerKeys.savedContent,
    queryFn: listSavedContent,
    enabled: signedIn,
  })

/**
 * Toggling a content favourite.
 *
 * Removing is applied to the cached list at once, since the item is already
 * there to drop. Adding waits for the server, which is the one that knows
 * whether the item is still public; the refetch then brings its approved title.
 */
export const useToggleSavedContent = () => {
  const client = useQueryClient()

  return useMutation({
    retry: false,
    mutationFn: ({ kind, id, save }: { kind: FavoriteContentPath; id: number; save: boolean }) =>
      save ? saveContent(kind, id) : unsaveContent(kind, id),
    onMutate: async ({ kind, id, save }) => {
      if (save) return { previous: undefined }
      await client.cancelQueries({ queryKey: explorerKeys.savedContent })
      const previous = client.getQueryData<SavedContentList>(explorerKeys.savedContent)
      if (previous) {
        const species = kind === 'experiences' ? 'experience' : 'event'
        client.setQueryData<SavedContentList>(explorerKeys.savedContent, {
          ...previous,
          data: previous.data.filter(
            (entry) => !(entry.content.kind === species && entry.content.id === id)
          ),
        })
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) client.setQueryData(explorerKeys.savedContent, context.previous)
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: explorerKeys.savedContent })
    },
  })
}
