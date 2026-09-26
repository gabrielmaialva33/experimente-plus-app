/**
 * Mirrors the server's canonical rule (`AnalyticsRedirectService.brazilianNumber`):
 * prefix 55 only for a national-length number, accept 12-13 digits only when
 * they already carry it, and refuse anything else instead of building a link
 * that WhatsApp will reject.
 */
export const brazilianWhatsApp = (value: string | null): string | null => {
  if (!value) return null

  const digits = value.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 13) return null
  if (digits.length <= 11) return `55${digits}`

  return digits.startsWith('55') ? digits : null
}

/** `tel:` keeps a leading + so an international number still dials. */
export const dialable = (value: string | null): string | null => {
  if (!value) return null
  const cleaned = value.replace(/[^\d+]/g, '')
  return cleaned.length >= 8 ? cleaned : null
}

/** A syntactically plausible address becomes a `mailto:`; anything else is dropped. */
export const mailto = (value: string | null): string | null => {
  const address = value?.trim()
  return address && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? `mailto:${address}` : null
}

/**
 * Partners type "@casa", "casa" or paste the profile link; all three open the
 * same profile. A value that is not an Instagram handle opens nothing rather
 * than an arbitrary address.
 */
export const instagramProfile = (value: string | null): string | null => {
  const raw = value?.trim()
  if (!raw) return null
  const fromUrl = raw.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)\/?(?:[?#].*)?$/i)
  const handle = (fromUrl ? fromUrl[1] : raw).replace(/^@/, '')
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? `https://instagram.com/${handle}` : null
}
