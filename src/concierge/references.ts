import type { ConciergeGroundingItem, ConciergeReply } from '@/api/concierge'

/**
 * A reference the assistant may show.
 *
 * Only `reply.items` produces one: the model's text is never parsed for places
 * and no destination is ever assembled from a name. A reference without the
 * public identity pair is shown as plain text instead of as a broken link.
 */
export interface ConciergeReferenceView {
  key: string
  ref: string
  kindLabel: string | null
  name: string
  /** Where it is, as the server described it. */
  place: string | null
  detail: string | null
  citySlug: string | null
  establishmentSlug: string | null
}

const kindLabels: Record<string, string> = {
  establishment: 'Lugar',
  experience: 'Experiência',
  event: 'Evento',
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function reference(item: ConciergeGroundingItem, index: number): ConciergeReferenceView[] {
  const name = optionalString(item.name)
  if (!name) return []

  const ref = optionalString(item.ref)
  const establishmentName = optionalString(item.establishment_name)

  return [
    {
      key: ref ?? `${optionalString(item.kind) ?? 'item'}-${index}`,
      ref: ref ?? '',
      kindLabel: kindLabels[item.kind] ?? null,
      name,
      // For an experience or an event the name is the content, so the venue is
      // worth showing; for an establishment it would only repeat the name.
      place: establishmentName && establishmentName !== name ? establishmentName : null,
      detail: [optionalString(item.category), optionalString(item.district)]
        .filter(Boolean)
        .join(' · ') || null,
      citySlug: optionalString(item.city_slug),
      establishmentSlug: optionalString(item.establishment_slug),
    },
  ]
}

/** Keeps the server's order; it is the only ranking the reply has. */
export function conciergeReferences(
  reply: ConciergeReply | null | undefined
): ConciergeReferenceView[] {
  return (reply?.items ?? []).flatMap(reference)
}

export const isNavigable = (view: ConciergeReferenceView): boolean =>
  Boolean(view.citySlug && view.establishmentSlug)

/**
 * The item a reference names, when it is an experience or an event: the place
 * page scrolls to it (audit A14). A place itself, or a reference the app does not
 * recognise, opens the place at the top.
 */
export function referenceHighlight(ref: string): { kind: 'experience' | 'event'; id: number } | null {
  const match = /^(experience|event):(\d+)$/.exec(ref)
  return match ? { kind: match[1] as 'experience' | 'event', id: Number(match[2]) } : null
}
