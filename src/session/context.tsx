import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { subscribeSessionEvents } from '@/api/session-events'
import { revokeSession } from '@/api/auth'
import { getContext, type MobileCapabilities, type MobileContext } from '@/api/me'
import { readCredentials, SessionExpiredError } from '@/api/session'

/**
 * Session and capability state.
 *
 * `loading` is a first-class state, not an absence of one: ADR-0023 §2 forbids
 * rendering a partner area before the server has said the actor has it, so the
 * navigation must be able to tell "not a partner" apart from "not known yet".
 */
export type SessionStatus = 'loading' | 'anonymous' | 'authenticated' | 'unavailable'

interface SessionValue {
  status: SessionStatus
  context: MobileContext | null
  capabilities: MobileCapabilities | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [context, setContext] = useState<MobileContext | null>(null)

  const generation = useRef(0)
  const revalidating = useRef(false)
  const changing = useRef(false)
  const closing = useRef(false)

  const load = useCallback(async () => {
    if (changing.current || closing.current) return
    const version = ++generation.current
    try {
      const credentials = await readCredentials()
      if (version !== generation.current) return
      if (!credentials) {
        setContext(null)
        setStatus('anonymous')
        return
      }
      const next = await getContext()
      if (version !== generation.current) return
      setContext(next)
      setStatus('authenticated')
    } catch (error) {
      if (version !== generation.current) return
      setContext(null)
      // Network/rule failures must not discard a still-valid refresh credential.
      if (error instanceof SessionExpiredError) {
        // Credential disposal belongs to the serialized session layer, which
        // knows whether the rejected pair has already been replaced.
        setStatus('anonymous')
        return
      }
      setStatus('unavailable')
    } finally {
      if (version === generation.current) revalidating.current = false
    }
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeSessionEvents((event) => {
      if (closing.current && event !== 'expired') return
      if (event === 'context-invalidated' && (changing.current || revalidating.current)) return
      if (event === 'operation-changing') changing.current = true
      if (event === 'operation-settled' || event === 'expired') changing.current = false
      generation.current += 1
      revalidating.current = false
      setContext(null)
      setStatus(event === 'expired' ? 'anonymous' : 'loading')
      if (event === 'context-invalidated' || event === 'operation-settled') {
        revalidating.current = true
        void load()
      }
    })
    const init = async () => {
      await load()
    }
    void init()
    return () => {
      unsubscribe()
      generation.current += 1
    }
  }, [load])

  const value = useMemo<SessionValue>(
    () => ({
      status,
      context,
      capabilities: context?.capabilities ?? null,
      refresh: load,
      signOut: async () => {
        // Revoking server-side matters on a shared or resold device: the opaque
        // refresh token would otherwise stay valid for its full lifetime.
        generation.current += 1
        closing.current = true
        setContext(null)
        setStatus('loading')
        try {
          await revokeSession()
        } finally {
          generation.current += 1
          closing.current = false
          changing.current = false
          revalidating.current = false
          setContext(null)
          setStatus('anonymous')
        }
      },
    }),
    [status, context, load]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)

  if (!value) {
    throw new Error('useSession must be used inside a SessionProvider')
  }

  return value
}

/**
 * Presence rules for the partner areas.
 *
 * While the context is loading every partner capability reads as false, so a
 * privileged area is mounted only after the server has granted it — never
 * rendered and then hidden. `partner.enabled` alone never composes navigation:
 * ADR-0022 §3 requires the specific redemption capabilities.
 */
export function usePartnerAreas() {
  const { capabilities } = useSession()

  return {
    canValidate: capabilities?.partner?.redemptions?.validate === true,
    canReadHistory: capabilities?.partner?.redemptions?.read === true,
  }
}
