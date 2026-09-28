import { onlineManager } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AppState } from 'react-native'

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

/**
 * How long the context may take. The splash waits for this read at start-up,
 * and a request that never answered (a captive portal, a dead link that still
 * reads as connected) held the app behind it with no way out. Past this the
 * session settles on `unavailable`, which keeps the credential and already
 * offers a new attempt, on reconnection, on return to the app or by hand.
 */
export const CONTEXT_TIMEOUT_MS = 10_000

/**
 * The context, given up after `CONTEXT_TIMEOUT_MS`. Only its own request is
 * aborted: a renewal it waits on belongs to the serialized session queue and
 * runs to the end, since abandoning one the server may already have rotated
 * would lose the pair. Settling by the clock, not by the abort, is what bounds
 * the wait while such a renewal is still out.
 */
function readContext(): Promise<MobileContext> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error('context read timed out'))
    }, CONTEXT_TIMEOUT_MS)
  })
  return Promise.race([getContext(controller.signal), expired]).finally(() => clearTimeout(timer))
}

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
      const next = await readContext()
      if (version !== generation.current) return
      setContext(next)
      setStatus('authenticated')
    } catch (error) {
      if (version !== generation.current) return
      setContext(null)
      // Network/rule failures and timeouts must not discard a still-valid refresh credential.
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
      if (event === 'context-invalidated') {
        // A 403 refuses one request; it is not a change of person. The session
        // keeps the state and the context the tabs and the open screens were
        // composed from while the context is asked again, and the answer then
        // applies what changed: Validar goes if the capability went, and a
        // credential the server rejects still ends the session. Dropping to
        // `loading` here swapped the tabs for a visitor's and sent the person
        // to Explorar on every refusal.
        if (changing.current || revalidating.current) return
        revalidating.current = true
        void load()
        return
      }
      if (event === 'operation-changing') changing.current = true
      if (event === 'operation-settled' || event === 'expired') changing.current = false
      generation.current += 1
      revalidating.current = false
      setContext(null)
      setStatus(event === 'expired' ? 'anonymous' : 'loading')
      if (event === 'operation-settled') {
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

  // A context that failed to load for want of a connection (a cold start on the
  // subway) kept the app in visitor tabs after the signal came back, until the
  // person found "Tentar de novo" under Entrar. The credential is still there,
  // so the context is asked again when the connection or the app returns.
  useEffect(() => {
    if (status !== 'unavailable') return
    const retry = () => void load()
    const offline = onlineManager.subscribe((online) => {
      if (online) retry()
    })
    const foreground = AppState.addEventListener('change', (next) => {
      if (next === 'active') retry()
    })
    return () => {
      offline()
      foreground.remove()
    }
  }, [status, load])

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
 * rendered and then hidden. A revalidation after a 403 keeps the last answer
 * until the next one arrives. `partner.enabled` alone never composes navigation:
 * ADR-0022 §3 requires the specific redemption capabilities.
 */
export function usePartnerAreas() {
  const { capabilities } = useSession()

  return {
    canValidate: capabilities?.partner?.redemptions?.validate === true,
    canReadHistory: capabilities?.partner?.redemptions?.read === true,
  }
}
