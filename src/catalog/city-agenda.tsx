import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { resolveMediaUrl } from '@/api/config'
import { RemoteImage } from '@/components/remote-image'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

import {
  formatAgendaPublication,
  formatAgendaWindow,
  type AgendaItemView,
  type CityAgendaView,
} from './agenda'
import { useCityAgenda } from './queries'

interface CityAgendaProps {
  citySlug: string | null
}

interface Band {
  key: string
  title: string
  hint: string | null
  items: AgendaItemView[]
  /** Today's band needs no date; the server already put the item there. */
  withDate: boolean
}

function bandsOf(agenda: CityAgendaView): Band[] {
  return [
    {
      key: 'happening-today',
      title: 'Acontecendo hoje',
      hint: null,
      items: agenda.happeningToday,
      withDate: false,
    },
    {
      key: 'upcoming',
      title: 'Em breve',
      hint: null,
      items: agenda.upcoming,
      withDate: true,
    },
    {
      key: 'new-experiences',
      title: 'Novidades',
      // The band is chronological. There is no prominence contract to imply.
      hint: 'Publicados recentemente',
      items: agenda.newExperiences,
      withDate: false,
    },
  ]
}

function metaOf(item: AgendaItemView, timeZone: string | null, withDate: boolean): string | null {
  return item.kind === 'event'
    ? formatAgendaWindow(item, timeZone, withDate)
    : formatAgendaPublication(item.publishedAt, timeZone)
}

/**
 * Event and experience bands of the selected city.
 *
 * Everything temporal arrives resolved in the city's timezone: the card formats
 * `starts_at`, `published_at` and `local_date`, and the band an item came in
 * decides its label. Each card opens the establishment by its public identity,
 * `city_slug` plus the establishment slug, never by a numeric id.
 */
export function CityAgenda({ citySlug }: CityAgendaProps) {
  const colors = useColors()
  const router = useRouter()
  const agenda = useCityAgenda(citySlug)
  const data = agenda.data

  if (agenda.isPending && !data) {
    return (
      <View style={styles.section}>
        <Text style={[styles.status, { color: colors.mutedForeground }]}>
          Carregando a agenda da cidade…
        </Text>
      </View>
    )
  }

  // A failed agenda must not take discovery down with it; the catalogue below
  // keeps working and the band simply does not appear.
  if (!data) return null

  const cityName = data.city.name ?? 'sua cidade'

  if (data.isEmpty) {
    return (
      <View style={styles.section}>
        <Text style={[styles.status, { color: colors.mutedForeground }]}>
          Nenhum evento ou novidade publicada em {cityName} por enquanto.
        </Text>
      </View>
    )
  }

  const open = (item: AgendaItemView) =>
    router.push(`/estabelecimento/${item.citySlug}/${item.establishmentSlug}`)

  return (
    <View style={styles.section}>
      {bandsOf(data)
        .filter((band) => band.items.length > 0)
        .map((band) => (
          <View key={band.key} testID={`agenda-band-${band.key}`} style={styles.band}>
            <Text style={[styles.bandTitle, { color: colors.foreground }]}>{band.title}</Text>
            {band.hint ? (
              <Text style={[styles.bandHint, { color: colors.mutedForeground }]}>{band.hint}</Text>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.row}
            >
              {band.items.map((item) => {
                const meta = metaOf(item, data.city.timeZone, band.withDate)

                return (
                  <Pressable
                    key={`${item.kind}-${item.id}`}
                    testID={`agenda-card-${item.kind}-${item.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={[item.title, item.establishmentName, meta]
                      .filter(Boolean)
                      .join(', ')}
                    onPress={() => open(item)}
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    {item.cover ? (
                      <RemoteImage
                        source={{ uri: resolveMediaUrl(item.cover.url) }}
                        accessibilityLabel={item.cover.altText}
                        style={styles.cover}
                        contentFit="cover"
                        transition={150}
                        fallback={<CoverFallback />}
                      />
                    ) : (
                      <CoverFallback />
                    )}

                    <View style={styles.body}>
                      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {meta ? (
                        <Text style={[styles.meta, { color: colors.primaryAccent }]} numberOfLines={1}>
                          {meta}
                        </Text>
                      ) : null}
                      {item.establishmentName ? (
                        <Text
                          style={[styles.place, { color: colors.mutedForeground }]}
                          numberOfLines={1}
                        >
                          {item.establishmentName}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        ))}
    </View>
  )
}

/** A card with no picture, or one that failed to load, keeps the same footprint. */
function CoverFallback() {
  const colors = useColors()
  return (
    <View style={[styles.coverFallback, { backgroundColor: colors.contentAbsent }]}>
      <Text style={[styles.fallback, { color: colors.contentAbsentForeground }]}>Foto indisponível</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, paddingTop: spacing.sm },
  status: { ...typography.caption, paddingHorizontal: spacing.lg },
  band: { gap: spacing.xs },
  bandTitle: { ...typography.body, fontWeight: '700', paddingHorizontal: spacing.lg },
  bandHint: { ...typography.caption, paddingHorizontal: spacing.lg },
  row: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  card: {
    borderRadius: radius.surface,
    borderWidth: 1,
    overflow: 'hidden',
    width: 232,
  },
  cover: { height: 96, width: '100%' },
  coverFallback: { height: 96, justifyContent: 'center', paddingHorizontal: spacing.md, width: '100%' },
  fallback: typography.caption,
  body: { gap: spacing.xs, padding: spacing.md },
  title: { ...typography.body, fontWeight: '600' },
  meta: { ...typography.caption, fontWeight: '600' },
  place: typography.caption,
})
