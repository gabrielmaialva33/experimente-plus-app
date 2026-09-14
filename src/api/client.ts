import { expireSession, readCredentials, refreshSession, SessionExpiredError } from './session'
import { notifySessionEvent } from './session-events'
import { decode, responseError, send, type RequestOptions } from './transport'

export { ApiError, type RequestOptions } from './transport'

/** One coordinated renewal and one replay; rule failures are never retried. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let accessToken: string | undefined
  if (options.authenticated) {
    const credentials = await readCredentials()
    if (!credentials) throw new SessionExpiredError()
    accessToken = credentials.accessToken
  }

  let response = await send(path, options, accessToken)
  if (response.status === 401 && options.authenticated) {
    const renewed = await refreshSession(accessToken)
    accessToken = renewed.accessToken
    response = await send(path, options, accessToken)
    if (response.status === 401) {
      if (await expireSession(accessToken)) throw new SessionExpiredError()
      // A newer pair is still valid. Surface this stale request's failure
      // without telling the provider to discard the replacement session.
      throw await responseError(response, true)
    }
  }

  if (response.ok) return (await decode(response)) as T
  if (response.status === 403 && options.authenticated && path !== '/api/v1/me/context') {
    notifySessionEvent('context-invalidated')
  }
  throw await responseError(response, options.authenticated || options.sensitive)
}
