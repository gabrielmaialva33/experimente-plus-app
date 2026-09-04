/**
 * Extracts the presentation token from a scanned code.
 *
 * The QR carries the validation URL with the token in its query string. Scanned
 * content is never executed or opened: only the token is taken, and only when
 * the payload is a well-formed HTTP(S) URL carrying one. A bare token is also
 * accepted, since a partner may type it in.
 */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/

export function extractPresentationToken(scanned: string): string | null {
  const value = scanned.trim()

  if (TOKEN_SHAPE.test(value)) {
    return value
  }

  try {
    const url = new URL(value)

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null
    }

    const token = url.searchParams.get('token')
    return token && TOKEN_SHAPE.test(token) ? token : null
  } catch {
    return null
  }
}
