import { request } from './client'
import type { components, operations } from './schema'
import {
  endSession,
  credentialsFromPayload,
  replaceCredentials,
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

/**
 * Registration issues the same credential pair as sign-in; never log its
 * payload. Like sign-in, it replaces and revokes a pair the device still held.
 */
export async function signUp(body: SignUpRequest): Promise<SignUpResponse> {
  const result = await request<SignUpResponse>('/api/v1/sessions/sign-up', {
    method: 'POST',
    body,
    sensitive: true,
  })
  await replaceCredentials(credentialsFromPayload(result.auth))
  return result
}

export type ForgotPasswordRequest =
  operations['requestPasswordReset']['requestBody']['content']['application/json']
export type ForgotPasswordResponse =
  operations['requestPasswordReset']['responses'][202]['content']['application/json']

/** A neutral request receipt, never a session or proof that an account exists. */
export function forgotPassword(body: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  return request<ForgotPasswordResponse>('/api/v1/sessions/forgot-password', {
    method: 'POST',
    body,
    sensitive: true,
  })
}

/**
 * Signs in and persists the pair in the platform keystore. The response is the
 * only place the refresh token is ever handled in memory. A pair the device
 * still held (a session that could not load) is replaced and revoked, best
 * effort: only once this sign-in succeeded, so a refused password keeps it.
 */
export async function signIn(uid: string, password: string): Promise<SignInResponse> {
  const result = await request<SignInResponse>('/api/v1/sessions/sign-in', {
    method: 'POST',
    body: { uid, password },
    sensitive: true,
  })

  await replaceCredentials(credentialsFromPayload(result.auth))
  return result
}

/**
 * Ends the session on both sides. The local wipe happens regardless: a network
 * failure must not leave the person signed in on the device, and the endpoint
 * is idempotent, so a missed revocation can be retried by signing in again.
 */
export const revokeSession = endSession
