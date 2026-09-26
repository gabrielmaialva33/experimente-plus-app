import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { resolveMediaUrl } from '@/api/config'
import { CompactCard } from '@/components/compact-card'
import { DateTile } from '@/components/date-tile'
import { SectionHeader } from '@/components/section-header'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

import {
  formatAgendaPublication,
  formatAgendaWindow,
  type AgendaEventView,
  type AgendaItemView,
  type CityAgendaView,
} from './agenda'
import { useCityAgenda } from './queries'

interface CityAgendaProps {
  citySlug: string | null
}

interface EventBand {
  key: 'happening-today' | 'upcoming'
  title: string
  items: AgendaEventView[]
  /** Today's band needs no date; the server already put the item there. */
  withDate: boolean
}

function eventBandsOf(agenda: CityAgendaView): EventBand[] {
  return [
    { key: 'happening-today', title: 'Acontecendo hoje', items: agenda.happeningToday, withDate: false },
    { key: 'upcoming', title: 'Em breve', items: agenda.upcoming, withDate: true },
  ]
}

/**
 * Event and experience bands of the selected city.
 *
 * Everything temporal arrives resolved in the city's timezone: the card formats
 * `starts_at`, `published_at` and `local_date`, and the band an item came in
 * decides its label. Each card opens the establishment by its public identity,
 * `city_slug` plus the establishment slug, never by a numeric id.
 *
 * An event is a date first, so its row leads with a date tile instead of a
 * photo or an empty photo box (audit A38); experiences keep a fixed-size card.
 */
export function CityAgenda({ citySlug }: CityAgendaProps) {
  const colors = useColors()
  const router = useRouter()
  const agenda = useCityAgenda(citySlug)
  const data = agenda.data

  if (agenda.isPending && !data) {
    return (
      <View style={styles.gutter}>
        <Text style={[styles.status, { color: colors.mutedForeground }]}>
          Carregando a agenda da cidade…
        </Text>
      </View>
    )
  }

  // A failed agenda must not take discovery down with it; the catalogue
  // keeps working and the section simply does not appear.
  if (!data) return null

  const cityName = data.city.name ?? 'sua cidade'
  const timeZone = data.city.timeZone
  const open = (item: AgendaItemView) =>
    router.push(`/estabelecimento/${item.citySlug}/${item.establishmentSlug}`)

  return (
    <View style={styles.section}>
      <View style={styles.gutter}>
        <SectionHeader title={`Acontece em ${cityName}`} />
      </View>

      {data.isEmpty ? (
        <Text style={[styles.status, styles.gutter, { color: colors.mutedForeground }]}>
          Nenhum evento ou novidade publicada em {cityName} por enquanto.
        </Text>
      ) : null}

      {eventBandsOf(data)
        .filter((band) => band.items.length > 0)
        .map((band) => (
          <View key={band.key} testID={`agenda-band-${band.key}`} style={[styles.band, styles.gutter]}>
            <Text style={[styles.bandTitle, { color: colors.mutedForeground }]}>{band.title}</Text>
            {band.items.map((item) => {
              // The tile carries the day, so the row itself only needs the hours.
              const hours = formatAgendaWindow(item, timeZone, false)
              const spoken = formatAgendaWindow(item, timeZone, band.withDate)
              const meta = [hours, item.establishmentName].filter(Boolean).join(' · ')

              return (
                <Pressable
                  key={`${item.kind}-${item.id}`}
                  testID={`agenda-card-${item.kind}-${item.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={[item.title, item.establishmentName, spoken].filter(Boolean).join(', ')}
                  onPress={() => open(item)}
                  style={({ pressed }) => [
                    styles.event,
                    { backgroundColor: colors.card, borderColor: colors.borderSubtle, opacity: pressed ? 0.92 : 1 },
                  ]}
                >
                  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    <DateTile
                      iso={item.startsAt}
                      timeZone={timeZone}
                      tone={band.key === 'happening-today' ? 'strong' : 'soft'}
                    />
                  </View>
                  <View style={styles.eventCopy}>
                    <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {meta ? (
                      <Text style={[styles.eventMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {meta}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              )
            })}
          </View>
        ))}

      {data.newExperiences.length > 0 ? (
        <View testID="agenda-band-new-experiences" style={styles.band}>
          <View style={styles.gutter}>
            <Text style={[styles.bandTitle, { color: colors.mutedForeground }]}>Novidades</Text>
            {/* The band is chronological. There is no prominence contract to imply. */}
            <Text style={[styles.bandHint, { color: colors.mutedForeground }]}>Publicados recentemente</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {data.newExperiences.map((item) => (
              <CompactCard
                key={`${item.kind}-${item.id}`}
                testID={`agenda-card-${item.kind}-${item.id}`}
                overline={item.establishmentName || null}
                title={item.title}
                meta={formatAgendaPublication(item.publishedAt, timeZone)}
                image={item.cover ? { uri: resolveMediaUrl(item.cover.url), alt: item.cover.altText } : null}
                onPress={() => open(item)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.lg },
  gutter: { paddingHorizontal: spacing.gutter },
  status: typography.meta,
  band: { gap: spacing.sm },
  bandTitle: { ...typography.overline },
  bandHint: { ...typography.caption, marginTop: 2 },
  row: { gap: spacing.md, paddingHorizontal: spacing.gutter },
  event: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: spacing.md,
  },
  eventCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
  eventTitle: { ...typography.label, ...textWeight('700'), fontSize: 16, lineHeight: 21 },
  eventMeta: typography.meta,
})
