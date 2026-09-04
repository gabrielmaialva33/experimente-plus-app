/**
 * The base URL selects the operation.
 *
 * The public catalog resolves the tenant from the request hostname (ADR-0003,
 * ADR-0016), so pointing the client at an operation's public domain is what
 * chooses it. The app never sends `tenant_id` on a public route.
 */
const DEFAULT_BASE_URL = 'https://experimente-plus.mahina.fun'

export const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL).replace(
  /\/+$/,
  ''
)

export const apiUrl = (path: string) => `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`

/**
 * Media URLs from the catalog projection are relative to the operation's
 * origin (`/uploads/...`), so they must be resolved against the base URL before
 * reaching an image loader.
 */
export const resolveMediaUrl = (url: string): string =>
  /^https?:\/\//i.test(url) ? url : apiUrl(url)
