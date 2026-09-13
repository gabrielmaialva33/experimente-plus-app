import { request } from './client'
import type { components, operations } from './schema'
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

export type SignUpRequest = operations['signUp']['requestBody']['content']['application/json']
export type SignUpResponse = components['schemas']['SignUpResponse']

/** Registration issues the same credential pair as sign-in; never log its payload. */
export async function signUp(body: SignUpRequest): Promise<SignUpResponse> {
  const result = await request<SignUpResponse>('/api/v1/sessions/sign-up', {
    method: 'POST', body, sensitive: true,
  })
  await writeCredentials(credentialsFromPayload(result.auth))
  return result
}

export type ForgotPasswordRequest = operations['requestPasswordReset']['requestBody']['content']['application/json']
export type ForgotPasswordResponse = operations['requestPasswordReset']['responses'][202]['content']['application/json']

/** A neutral request receipt, never a session or proof that an account exists. */
export function forgotPassword(body: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  return request<ForgotPasswordResponse>('/api/v1/sessions/forgot-password', {
    method: 'POST', body, sensitive: true,
  })
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
