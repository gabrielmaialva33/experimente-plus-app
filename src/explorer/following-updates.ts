import type { Href } from 'expo-router'

import type { FollowingUpdate } from '@/api/explorer'
import { formatAgendaPublication } from '@/catalog/agenda'
import { placeHref } from '@/place/links'

/** What an update is, as the place's own page names it. */
export const UPDATE_KIND_LABEL: Record<FollowingUpdate['kind'], string> = {
  experience: 'Experiência',
  event: 'Evento',
  showcase_item: 'Vitrine',
}

/** How a card of "Dos lugares que você segue" reads. */
export interface FollowingUpdateView {
  key: string
  kind: FollowingUpdate['kind']
  kindLabel: string
  title: string
  establishmentName: string
  /** For an event, when it happens; otherwise when it was published. */
  when: string | null
  /** A showcase item's displayed price; never something to pay here. */
  price: string | null
  cover: { url: string; alt: string } | null
  /** The place's page, brought to the item, since an item has no page of its own. */
  href: Href
}

function eventWindow(startsAt: string | null, endsAt: string | null): string | null {
  if (!startsAt) return null
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) return null
  const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(start)
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const end = endsAt ? new Date(endsAt) : null
  const hours =
    end && !Number.isNaN(end.getTime())
      ? `${time.format(start)}–${time.format(end)}`
      : time.format(start)
  return `${day}, ${hours}`
}

function informationalPrice(cents: number | null): string | null {
  if (cents === null || !Number.isFinite(cents) || cents < 0) return null
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export function followingUpdateView(update: FollowingUpdate): FollowingUpdateView {
  const place = update.establishment
  return {
    key: `${update.kind}-${update.id}`,
    kind: update.kind,
    kindLabel: UPDATE_KIND_LABEL[update.kind],
    title: update.title,
    establishmentName: place.name,
    when:
      update.kind === 'event'
        ? eventWindow(update.starts_at, update.ends_at)
        : formatAgendaPublication(update.published_at, null),
    price:
      update.kind === 'showcase_item' ? informationalPrice(update.informational_price_cents) : null,
    cover: update.cover ? { url: update.cover.url, alt: update.cover.alt_text } : null,
    href: placeHref(place.city_slug, place.slug, { kind: update.kind, id: update.id }),
  }
}

/** Every update loaded so far, page after page, each once. */
export function loadedUpdates(pages: { data: FollowingUpdate[] }[] | undefined): FollowingUpdate[] {
  const seen = new Set<string>()
  const updates: FollowingUpdate[] = []
  for (const page of pages ?? []) {
    for (const update of page.data) {
      const key = `${update.kind}-${update.id}`
      if (seen.has(key)) continue
      seen.add(key)
      updates.push(update)
    }
  }
  return updates
}
