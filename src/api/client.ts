import { apiUrl } from './config'
import { readCredentials, refreshSession, SessionExpiredError } from './session'

/**
 * Thin HTTP client over the canonical API.
 *
 * It encodes the retry contract from `docs/product/17-aplicativo-movel-consumer-first.md`:
 * a `401` earns exactly one coordinated refresh and one replay; `403`, `422`
 * and rule errors never retry automatically; `429` is surfaced with its
 * `Retry-After` so the caller waits instead of looping.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    /** Seconds the server asked us to wait. Only set for `429`. */
    readonly retryAfterSeconds?: number
  ) {
    super(`request failed with ${status}`)
    this.name = 'ApiError'
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** Sends the bearer token and enables the single refresh-and-replay. */
  authenticated?: boolean
  signal?: AbortSignal
}

const parseRetryAfter = (header: string | null): number | undefined => {
  if (!header) return undefined
  const seconds = Number(header)
  return Number.isFinite(seconds) ? seconds : undefined
}

async function send(path: string, options: RequestOptions, accessToken?: string) {
  const headers: Record<string, string> = { accept: 'application/json' }

  if (options.body !== undefined) {
    headers['content-type'] = 'application/json'
  }
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`
  }

  return fetch(apiUrl(path), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  })
}

async function decode(response: Response): Promise<unknown> {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let accessToken: string | undefined

  if (options.authenticated) {
    const credentials = await readCredentials()
    if (!credentials) {
      throw new SessionExpiredError()
    }
    accessToken = credentials.accessToken
  }

  let response = await send(path, options, accessToken)

  // A single coordinated renewal, then one replay. Never a loop.
  if (response.status === 401 && options.authenticated) {
    const renewed = await refreshSession()
    response = await send(path, options, renewed.accessToken)
  }

  if (response.ok) {
    return (await decode(response)) as T
  }

  const body = await decode(response)
  const error = new ApiError(
    response.status,
    body,
    response.status === 429 ? parseRetryAfter(response.headers.get('retry-after')) : undefined
  )

  // A failed request is far easier to place with the route on it. The detail
  // stays out of the interface: production shows the product's own message.
  if (__DEV__) {
    error.message = `${response.status} ${options.method ?? 'GET'} ${path}`
    console.warn(`[api] ${error.message}`, body)
  }

  throw error
}
