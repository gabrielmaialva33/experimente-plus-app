import { apiUrl } from './config'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    readonly retryAfterSeconds?: number
  ) {
    super(`request failed with ${status}`)
    this.name = 'ApiError'
    // Field errors remain accessible, but are not serialized by generic reports.
    Object.defineProperty(this, 'body', { enumerable: false })
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  authenticated?: boolean
  signal?: AbortSignal
  idempotencyKey?: string
  sensitive?: boolean
}

const retryDeadlines = new Map<string, number>()

function parseRetryAfter(header: string | null): number | undefined {
  if (!header?.trim()) return undefined
  if (/^\d+$/.test(header.trim())) return Number(header)
  const deadline = Date.parse(header)
  return Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : undefined
}

/** JSON-only transport shared by requests and serialized session operations. */
export async function send(path: string, options: RequestOptions, accessToken?: string) {
  // Query strings can contain private content; do not retain them in this map.
  const key = `${options.method ?? 'GET'} ${path.split('?')[0]}`
  const remaining = (retryDeadlines.get(key) ?? 0) - Date.now()
  if (remaining > 0) throw new ApiError(429, null, Math.ceil(remaining / 1000))
  retryDeadlines.delete(key)

  const headers: Record<string, string> = { accept: 'application/json' }
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (accessToken) headers.authorization = `Bearer ${accessToken}`
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey
  const privateRequest = options.authenticated || options.sensitive
  if (privateRequest) headers['cache-control'] = 'no-store'

  const response = await fetch(apiUrl(path), {
    method: options.method ?? 'GET', headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    ...(privateRequest ? { cache: 'no-store' as const } : {}),
  })
  if (response.status === 429) {
    const seconds = parseRetryAfter(response.headers.get('retry-after'))
    if (seconds !== undefined) {
      retryDeadlines.set(key, Math.max(retryDeadlines.get(key) ?? 0, Date.now() + seconds * 1000))
    }
  }
  return response
}

export async function decode(response: Response): Promise<unknown> {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return text }
}

export async function responseError(response: Response, privateRequest = false): Promise<ApiError> {
  // Once headers established a rule error, a broken response body must not
  // turn it into a network error eligible for automatic retry.
  const body = privateRequest && response.status === 404 ? null : await decode(response).catch(() => null)
  return new ApiError(response.status, body,
    response.status === 429 ? parseRetryAfter(response.headers.get('retry-after')) : undefined)
}
