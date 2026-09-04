import type { EstablishmentSummary } from '@/catalog/types'

export interface MapPin {
  slug: string
  name: string
  category: string | null
  latitude: number
  longitude: number
}

export interface MapRendererProps {
  pins: MapPin[]
  center: { latitude: number; longitude: number }
  onSelect: (slug: string) => void
}

/** Only establishments the projection actually located can be drawn. */
export const toPins = (establishments: EstablishmentSummary[]): MapPin[] =>
  establishments.flatMap((item) =>
    item.address.latitude != null && item.address.longitude != null
      ? [
          {
            slug: item.slug,
            name: item.name,
            category: item.primary_category?.name ?? null,
            latitude: item.address.latitude,
            longitude: item.address.longitude,
          },
        ]
      : []
  )
