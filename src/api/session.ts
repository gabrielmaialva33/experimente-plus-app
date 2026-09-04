import * as SecureStore from 'expo-secure-store'
import { createMMKV } from 'react-native-mmkv'

import { apiUrl } from './config'

/**
 * Session credentials live only in the platform keystore (ADR-0022 §4).
 *
 * Two rules drive this module and neither is negotiable:
 *
 * 1. Persistent credentials never leave Keychain/Keystore, and never reach a
 *    log, analytics event, clipboard or notification.
 * 2. Every operation that consumes the refresh token — renewal, operation
 *    creation and operation switch — is serialized into a single in-flight
 *    rotation. The server revokes the parent and mints exactly one child, so
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
let rotation: Promise<Credentials> | null = null

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

/**
 * Serializes every refresh-consuming call.
 *
 * `consume` receives the current refresh token and must return the credential
 * envelope the server minted. Callers that arrive while a rotation is already
 * running await the same promise instead of spending the credential twice.
 */
export async function rotateCredentials(
  consume: (refreshToken: string) => Promise<AuthTokensPayload>
): Promise<Credentials> {
  if (rotation) {
    return rotation
  }

  rotation = (async () => {
    const current = await readCredentials()

    if (!current) {
      throw new SessionExpiredError()
    }

    try {
      const payload = await consume(current.refreshToken)
      const next = credentialsFromPayload(payload)
      await writeCredentials(next)
      return next
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        await clearCredentials()
      }
      throw error
    }
  })()

  try {
    return await rotation
  } finally {
    rotation = null
  }
}

/** Renews the pair. A `401` here is terminal: the local session ends. */
export async function refreshSession(): Promise<Credentials> {
  return rotateCredentials(async (refreshToken) => {
    const response = await fetch(apiUrl('/api/v1/sessions/refresh'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (response.status === 401) {
      throw new SessionExpiredError()
    }

    if (!response.ok) {
      throw new Error(`refresh failed with ${response.status}`)
    }

    // Every credential-issuing endpoint wraps the pair in `auth`. Reading the
    // body directly yields undefined tokens, which the keystore then rejects.
    const body = (await response.json()) as { auth: AuthTokensPayload }
    return body.auth
  })
}
