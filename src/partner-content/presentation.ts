import type { PartnerContentItemKind, PartnerContentPublicItem } from '@/api/partner-content'

export interface PublishedContentMediaView {
  id: number
  isCover: boolean
  altText: string
  caption: string | null
  url: string
}

export interface PublishedContentView {
  id: number
  kind: PartnerContentItemKind
  title: string
  description: string | null
  startsAt: string | null
  endsAt: string | null
  informationalPriceCents: number | null
  publishedAt: string | null
  media: PublishedContentMediaView[]
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function publicMedia(item: PartnerContentPublicItem): PublishedContentMediaView[] {
  return (item.media ?? []).flatMap((media) => {
    const url = optionalString(media.asset?.url)
    const altText = optionalString(media.alt_text)
    if (!url || !altText) return []

    return [
      {
        id: media.id,
        isCover: media.is_cover,
        altText,
        caption: optionalString(media.caption),
        url,
      },
    ]
  })
}

/**
 * Converts the public item into view data.
 *
 * Publication is already resolved: the payload carries the approved text, so the
 * client neither reads `published_snapshot` nor falls back to a live column.
 * An item whose title did not survive serialization has nothing to show, which
 * is the only reason to drop one here.
 */
export function publishedContentView(
  item: PartnerContentPublicItem
): PublishedContentView | null {
  const title = optionalString(item.title)
  if (!title) return null

  const price =
    typeof item.informational_price_cents === 'number' &&
    Number.isFinite(item.informational_price_cents)
      ? Math.max(0, Math.trunc(item.informational_price_cents))
      : null

  return {
    id: item.id,
    kind: item.kind,
    title,
    description: optionalString(item.description),
    startsAt: optionalString(item.starts_at),
    endsAt: optionalString(item.ends_at),
    informationalPriceCents: price,
    publishedAt: optionalString(item.published_at),
    media: publicMedia(item),
  }
}
