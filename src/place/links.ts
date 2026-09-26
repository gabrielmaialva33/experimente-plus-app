import type { PartnerContentItemKind } from '@/api/partner-content'

/** The search parameter that names the item a place page opens on (audit A14). */
export const HIGHLIGHT_PARAM = 'destaque'

/** How an experience, event or showcase item is named in a place link. */
export const highlightKey = (kind: PartnerContentItemKind, id: number) => `${kind}-${id}`

/**
 * A place page, optionally brought to one of its items.
 *
 * Experiences and events have no page of their own: they live on their place's
 * page. A link from the agenda, the Concierge or "Para você" names the item, and
 * the page scrolls to it and marks it instead of opening at the top, where the
 * item the person chose is nowhere in sight.
 */
export function placeHref(
  citySlug: string,
  slug: string,
  highlight?: { kind: PartnerContentItemKind; id: number } | null
) {
  const path = `/estabelecimento/${citySlug}/${slug}`
  return highlight ? `${path}?${HIGHLIGHT_PARAM}=${highlightKey(highlight.kind, highlight.id)}` : path
}
