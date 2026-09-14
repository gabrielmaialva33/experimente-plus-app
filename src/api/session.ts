import * as SecureStore from 'expo-secure-store'
import { createMMKV } from 'react-native-mmkv'

import { notifySessionEvent } from './session-events'
import { responseError, send } from './transport'

/**
 * Session credentials live only in the platform keystore (ADR-0022 §4).
 *
 * Two rules drive this module and neither is negotiable:
 *
 * 1. Persistent credentials never leave Keychain/Keystore, and never reach a
 *    log, analytics event, clipboard or notification.
 * 2. Every operation that consumes the refresh token — renewal, operation
 *    creation and operation switch — is serialized into a single queue. The
 *    server revokes the parent and mints exactly one child, so
 *    two concurrent consumers would produce one success and one `401`.
 */

const ACCESS_KEY = 'ep.access_token'
const REFRESH_KEY = 'ep.refresh_token'
const EXPIRY_KEY = 'ep.access_expires_at'
const INSTALL_SENTINEL = 'ep.install_sentinel'

/**
 * Keeps credentials on this device only, and unreadable while it is locked.
 * Without it, iOS would sync them through the iCloud Keychain.
 */
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

/**
 * MMKV is erased when the app is uninstalled on both platforms; the iOS
 * Keychain is not. A missing sentinel therefore means this is a fresh install,
 * and any credential still in the keychain is a ghost from a previous one.
 * Restoring it would resurrect a session the person believed they had destroyed.
 */
const localFlags = createMMKV({ id: 'ep.flags' })

async function discardCredentialsFromPreviousInstall(): Promise<void> {
  if (localFlags.getBoolean(INSTALL_SENTINEL)) {
    return
  }

  await clearCredentials()
  localFlags.set(INSTALL_SENTINEL, true)
}

export interface Credentials {
  accessToken: string
  refreshToken: string
  /** Epoch milliseconds. Derived from `expires_in` at the time of issue. */
  accessExpiresAt: number
}

/** The credential envelope returned by every endpoint that issues tokens. */
export interface AuthTokensPayload {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  refresh_expires_in: number
}

export class SessionExpiredError extends Error {
  constructor() {
    super('session expired')
    this.name = 'SessionExpiredError'
  }
}

export const credentialsFromPayload = (payload: AuthTokensPayload): Credentials => ({
  accessToken: payload.access_token,
  refreshToken: payload.refresh_token,
  accessExpiresAt: Date.now() + payload.expires_in * 1000,
})

let cache: Credentials | null | undefined
let queue: Promise<unknown> = Promise.resolve()
let refreshInFlight: Promise<Credentials> | null = null

export async function readCredentials(): Promise<Credentials | null> {
  if (cache !== undefined) {
    return cache
  }

  await discardCredentialsFromPreviousInstall()

  const [accessToken, refreshToken, expiry] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY, secureOptions),
    SecureStore.getItemAsync(REFRESH_KEY, secureOptions),
    SecureStore.getItemAsync(EXPIRY_KEY, secureOptions),
  ])

  cache =
    accessToken && refreshToken
      ? { accessToken, refreshToken, accessExpiresAt: Number(expiry ?? 0) }
      : null

  return cache
}

/**
 * The platform can reject a write (size, keychain error). Expo enforces no size
 * limit of its own, so the requirement is handling the failure rather than
 * designing around an assumed cap: a credential that cannot be persisted must
 * not be left half-written, and the session falls back to re-authentication.
 */
export async function writeCredentials(credentials: Credentials): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, credentials.accessToken, secureOptions),
      SecureStore.setItemAsync(REFRESH_KEY, credentials.refreshToken, secureOptions),
      SecureStore.setItemAsync(EXPIRY_KEY, String(credentials.accessExpiresAt), secureOptions),
    ])
    cache = credentials
  } catch (cause) {
    await clearCredentials()
    throw new Error('failed to persist credentials', { cause })
  }
}

export async function clearCredentials(): Promise<void> {
  cache = null
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY, secureOptions),
    SecureStore.deleteItemAsync(REFRESH_KEY, secureOptions),
    SecureStore.deleteItemAsync(EXPIRY_KEY, secureOptions),
  ])
}

/** Distinct operations must run, in order, even after a predecessor fails. */
function serializeSessionOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation)
  queue = result.catch(() => {})
  return result
}

export async function expireSession(expectedAccessToken?: string): Promise<boolean> {
  return serializeSessionOperation(async () => {
    const current = await readCredentials()
    // A delayed rejection from an old pair must not erase a newer session.
    if (expectedAccessToken && current?.accessToken !== expectedAccessToken) return false
    await clearCredentials()
    notifySessionEvent('expired')
    return true
  })
}

async function currentCredentials(): Promise<Credentials> {
  const current = await readCredentials()
  if (!current) throw new SessionExpiredError()
  return current
}

async function consumeCredentials(
  consume: (refreshToken: string) => Promise<AuthTokensPayload>
): Promise<Credentials> {
  const current = await currentCredentials()
  try {
    const next = credentialsFromPayload(await consume(current.refreshToken))
    await writeCredentials(next)
    return next
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      await clearCredentials()
      notifySessionEvent('expired')
    }
    throw error
  }
}

/** Each callback consumes the latest pair inside the queue, never at enqueue time. */
export function rotateCredentials(
  consume: (refreshToken: string) => Promise<AuthTokensPayload>
): Promise<Credentials> {
  return serializeSessionOperation(() => consumeCredentials(consume))
}

async function renewCredentials(): Promise<Credentials> {
  return consumeCredentials(async (refreshToken) => {
    const response = await send('/api/v1/sessions/refresh', {
      method: 'POST', sensitive: true, body: { refresh_token: refreshToken },
    })
    if (response.status === 401) throw new SessionExpiredError()
    if (!response.ok) {
      if (response.status === 403) notifySessionEvent('context-invalidated')
      throw await responseError(response, true)
    }
    const body = (await response.json()) as { auth: AuthTokensPayload }
    return body.auth
  })
}

/** Share renewals only. A late 401 reuses the pair that replaced its access token. */
export function refreshSession(rejectedAccessToken?: string): Promise<Credentials> {
  if (refreshInFlight) return refreshInFlight
  const result = serializeSessionOperation(async () => {
    const current = await currentCredentials()
    if (rejectedAccessToken && current.accessToken !== rejectedAccessToken) return current
    return renewCredentials()
  })
  refreshInFlight = result
  void result.then(
    () => { refreshInFlight = null },
    () => { refreshInFlight = null }
  )
  return result
}

/** Called only inside the queue; a replay rebuilds JSON with the new refresh. */
async function sendSessionMutation(path: string, body: Record<string, unknown>) {
  let current = await currentCredentials()
  const sendCurrent = () => send(path, {
    method: 'POST', authenticated: true, sensitive: true,
    body: { ...body, refresh_token: current.refreshToken },
  }, current.accessToken)
  let response = await sendCurrent()
  if (response.status === 401) {
    current = await renewCredentials()
    response = await sendCurrent()
    if (response.status === 401) {
      await clearCredentials()
      notifySessionEvent('expired')
      throw new SessionExpiredError()
    }
  }
  if (!response.ok) {
    if (response.status === 403) notifySessionEvent('context-invalidated')
    throw await responseError(response, true)
  }
  return response
}

export function rotateSessionRequest<T extends { auth: AuthTokensPayload }>(
  path: '/api/v1/tenants' | '/api/v1/tenants/switch', body: Record<string, unknown>
): Promise<T> {
  return serializeSessionOperation(async () => {
    notifySessionEvent('operation-changing')
    try {
      const response = await sendSessionMutation(path, body)
      const result = await response.json() as T
      await writeCredentials(credentialsFromPayload(result.auth))
      return result
    } finally {
      notifySessionEvent('operation-settled')
    }
  })
}

/** Logout waits for rotations, revokes the current pair and cannot resurrect it. */
export function endSession(): Promise<void> {
  return serializeSessionOperation(async () => {
    notifySessionEvent('operation-changing')
    try {
      if (await readCredentials()) await sendSessionMutation('/api/v1/sessions/logout', {})
    } catch {
      // Best effort server revocation; local logout is unconditional.
    } finally {
      await clearCredentials()
      notifySessionEvent('expired')
    }
  })
}
