import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { revokeSession } from '@/api/auth'
import { getContext, type MobileCapabilities, type MobileContext } from '@/api/me'
import { clearCredentials, readCredentials, SessionExpiredError } from '@/api/session'

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

  const load = async () => {
    try {
      // Reading the keystore can itself fail — a locked device, a corrupted
      // flag store. Outside the try that rejection escapes and the app stays on
      // the splash screen forever with no way out.
      const credentials = await readCredentials()

      if (!credentials) {
        setContext(null)
        setStatus('anonymous')
        return
      }

      setContext(await getContext())
      setStatus('authenticated')
    } catch (error) {
      setContext(null)

      // Only a rejected credential ends the session. A network failure or a
      // server error must not sign the person out: they still hold a valid
      // refresh token, and discarding it would lose a session over a blip.
      if (error instanceof SessionExpiredError) {
        await clearCredentials()
        setStatus('anonymous')
        return
      }

      setStatus('unavailable')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const value = useMemo<SessionValue>(
    () => ({
      status,
      context,
      capabilities: context?.capabilities ?? null,
      refresh: load,
      signOut: async () => {
        // Revoking server-side matters on a shared or resold device: the opaque
        // refresh token would otherwise stay valid for its full lifetime.
        await revokeSession()
        setContext(null)
        setStatus('anonymous')
      },
    }),
    [status, context]
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
