import type { Itinerary, ItineraryStop } from '@/api/explorer'
import { publicEstablishmentUrl } from '@/place/links'

/** The last line of a shared itinerary: where it was made, nothing more. */
export const ITINERARY_SHARE_FOOTER = 'Roteiro montado no Experimente+.'

/**
 * A stop's address as one line: street and number (or "s/n"), complement,
 * district and city. Without a street or a district there is no address to
 * give, and the line is left out rather than reduced to the city's name.
 */
export function stopAddressLine(stop: ItineraryStop): string | null {
  const address = stop.address
  if (!address || !stop.establishment) return null

  const street = [address.street, address.without_number ? 's/n' : address.number]
    .filter(Boolean)
    .join(', ')
  const streetLine = street && address.complement ? `${street} - ${address.complement}` : street
  if (!streetLine && !address.district) return null

  return [streetLine, address.district, stop.establishment.city_name].filter(Boolean).join(' · ')
}

/**
 * The text the person sends when they share an itinerary: its name, then each
 * stop in order with its name, address and the public page of the place, then
 * a short footer.
 *
 * Only what is already public goes out — the place's name, address and page.
 * The stops' notes are the person's own and stay in the app, and a stop whose
 * place left the catalogue has no public page to send, so it is skipped. There
 * is no link to the itinerary itself: it is private, and nothing here makes it
 * otherwise. `null` when no stop can be shared.
 */
export function itineraryShareMessage(
  itinerary: Pick<Itinerary, 'name' | 'stops'>,
  placeUrl: (citySlug: string, slug: string) => string = publicEstablishmentUrl
): string | null {
  const stops = itinerary.stops.filter((stop) => stop.establishment)
  if (stops.length === 0) return null

  const blocks = stops.map((stop, index) => {
    const place = stop.establishment!
    return [
      `${index + 1}. ${place.name}`,
      stopAddressLine(stop),
      placeUrl(place.city_slug, place.slug),
    ]
      .filter(Boolean)
      .join('\n')
  })

  return [`Roteiro: ${itinerary.name.trim()}`, ...blocks, ITINERARY_SHARE_FOOTER].join('\n\n')
}
