import type { Href } from 'expo-router'

import { apiUrl } from '@/api/config'
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
): Href {
  const path = `/estabelecimento/${citySlug}/${slug}` as const
  return highlight
    ? `${path}?${HIGHLIGHT_PARAM}=${highlightKey(highlight.kind, highlight.id)}`
    : path
}

/**
 * The public address of an establishment, as someone else would open it.
 *
 * Built from the city and establishment slugs because that pair is the public
 * identity (ADR-0016 §6) and the only one that resolves from a URL — sharing
 * the numeric id would hand out an address nobody can open.
 */
export const publicEstablishmentUrl = (citySlug: string, slug: string) =>
  apiUrl(`/cidades/${encodeURIComponent(citySlug)}/estabelecimentos/${encodeURIComponent(slug)}`)
