import { request } from './client'
import {
  clearCredentials,
  credentialsFromPayload,
  readCredentials,
  writeCredentials,
  type AuthTokensPayload,
} from './session'

interface SignInResponse {
  id: number
  full_name: string | null
  email: string
  username: string | null
  auth: AuthTokensPayload
}

/**
 * Signs in and persists the pair in the platform keystore. The response is the
 * only place the refresh token is ever handled in memory.
 */
export async function signIn(uid: string, password: string): Promise<SignInResponse> {
  const result = await request<SignInResponse>('/api/v1/sessions/sign-in', {
    method: 'POST',
    body: { uid, password },
  })

  await writeCredentials(credentialsFromPayload(result.auth))
  return result
}

/**
 * Ends the session on both sides. The local wipe happens regardless: a network
 * failure must not leave the person signed in on the device, and the endpoint
 * is idempotent, so a missed revocation can be retried by signing in again.
 */
export async function revokeSession(): Promise<void> {
  try {
    const credentials = await readCredentials()

    if (credentials) {
      await request<unknown>('/api/v1/sessions/logout', {
        method: 'POST',
        authenticated: true,
        body: { refresh_token: credentials.refreshToken },
      })
    }
  } catch {
    // Best effort; the local credential is cleared either way.
  } finally {
    await clearCredentials()
  }
}
