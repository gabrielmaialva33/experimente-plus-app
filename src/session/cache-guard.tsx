import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { useSession } from '@/session/context'

/**
 * Private lists are cached under keys that do not name the person —
 * favourites, follows, interests, itineraries, one's own reviews — so the
 * cache itself must not outlive whoever filled it. When the session settles on
 * someone else (sign-out, expiry, another account, another operation) the whole
 * cache goes, and the next screen fetches instead of showing the previous
 * person's data on a shared device.
 *
 * `loading` and `unavailable` are not a change of person: a revalidation keeps
 * the same account, and a network failure keeps a still-valid credential.
 */
export function SessionCacheGuard() {
  const client = useQueryClient()
  const { status, context } = useSession()
  const owner = useRef<string | null>(null)

  useEffect(() => {
    if (status === 'loading' || status === 'unavailable') return
    const identity =
      status === 'authenticated' && context
        ? `${context.active_operation?.id ?? 0}:${context.user.id}`
        : null
    if (owner.current !== null && owner.current !== identity) client.clear()
    owner.current = identity
  }, [client, status, context])

  return null
}
