import { request } from './client'
import type { components } from './schema'

export type MobileContext = components['schemas']['MobileContext']
export type MobileCapabilities = components['schemas']['MobileCapabilities']

/** Authenticated bootstrap. Composes the UI; it never authorizes a request. */
export const getContext = () =>
  request<MobileContext>('/api/v1/me/context', { authenticated: true })

export type MobileUser = components['schemas']['MobileUser']

/**
 * Partial profile edit. Only name and username are editable here: e-mail,
 * password, verification and administrative fields are out of this operation's
 * reach by contract (UC-M06), and the server echoes the public projection only.
 */
export const updateProfile = (changes: components['schemas']['UpdateMobileProfileRequest']) =>
  request<{ user: MobileUser }>('/api/v1/me', {
    method: 'PATCH',
    authenticated: true,
    body: changes,
  })

/**
 * Destructive and deliberately awkward: the server requires the current
 * password and the exact literal, so the client must not "help" by
 * pre-filling either (UC-M06).
 */
export const ACCOUNT_DELETION_LITERAL = 'EXCLUIR MINHA CONTA'

export const deleteAccount = (currentPassword: string, confirmation: string) =>
  request<null>('/api/v1/me', {
    method: 'DELETE',
    authenticated: true,
    body: { current_password: currentPassword, confirmation },
  })
