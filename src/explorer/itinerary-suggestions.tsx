import { useRouter } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import type { Itinerary, ItinerarySuggestion } from '@/api/explorer'
import { useLoadingCopy } from '@/api/online'
import { useSelectedCity } from '@/catalog/city-store'
import { announce, useAnnouncement } from '@/components/announce'
import { Button } from '@/components/button'
import { SectionHeader } from '@/components/section-header'
import { EstablishmentCardRow } from '@/explorer/establishment-card-row'
import { useAddItineraryStop, useItinerarySuggestions } from '@/explorer/queries'
import { placeHref } from '@/place/links'
import { useStackedLayout } from '@/theme/font-scale'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * "a 1,2 km" or "a 500 m", as distances are read in Brazil; nothing without
 * one. The server sends kilometres to one decimal, so metres come in hundreds.
 */
export function distanceLabel(distanceKm: number | null): string | null {
  if (distanceKm === null || !Number.isFinite(distanceKm) || distanceKm < 0) return null
  const tenths = Math.round(distanceKm * 10)
  if (tenths === 0) return 'a menos de 100 m'
  if (tenths < 10) return `a ${tenths * 100} m`
  const km = tenths / 10
  return `a ${Number.isInteger(km) ? km : km.toFixed(1).replace('.', ',')} km`
}

/**
 * "Sugestões para o roteiro" — places to add next, from the server.
 *
 * Near the stops when one of them is on the map, the most visited of the city
 * otherwise; the hint says which, so the list does not claim a reason it does
 * not have. Adding uses the same mutation as every other way into the route,
 * and the list then asks again, since the route it was drawn for has changed.
 */
export function ItinerarySuggestions({ itinerary }: { itinerary: Itinerary }) {
  const colors = useColors()
  const router = useRouter()
  const citySlug = useSelectedCity()
  const query = useItinerarySuggestions(itinerary.id, citySlug)
  const add = useAddItineraryStop()
  const loading = useLoadingCopy('Carregando sugestões…')
  // With large text, "Adicionar" goes under the place instead of squeezing its name.
  const stacked = useStackedLayout()

  useAnnouncement(add.isError && 'Não foi possível adicionar agora.')

  // What was just added leaves at once, before the list is asked again.
  const present = new Set(itinerary.stops.map((stop) => stop.establishment?.id).filter(Boolean))
  const items = (query.data?.data ?? []).filter((item) => !present.has(item.establishment.id))
  const hint = query.data
    ? query.data.basis === 'nearby'
      ? 'Perto das suas paradas'
      : 'Os mais visitados'
    : null

  const addPlace = ({ establishment }: ItinerarySuggestion) => {
    if (add.isPending) return
    add.mutate(
      { id: itinerary.id, establishmentId: establishment.id },
      { onSuccess: () => announce(`${establishment.name} adicionado ao roteiro.`) }
    )
  }

  return (
    <View testID="itinerary-suggestions" style={styles.section}>
      <SectionHeader title="Sugestões para o roteiro" hint={hint} />

      {query.isPending ? (
        <Text style={[styles.body, { color: colors.mutedForeground }]}>{loading}</Text>
      ) : query.isError && !query.data ? (
        <View style={styles.notice}>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            Não foi possível carregar as sugestões agora.
          </Text>
          <Button
            label="Tentar de novo"
            variant="outline"
            onPress={() => void query.refetch()}
            testID="retry-suggestions"
          />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.notice}>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            Nenhuma sugestão por enquanto. Procure mais lugares em Explorar.
          </Text>
          <Button
            label="Procurar em Explorar"
            icon="compass-outline"
            variant="outline"
            onPress={() => router.navigate('/')}
          />
        </View>
      ) : (
        <View
          accessibilityRole="list"
          style={[styles.list, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
        >
          {items.map((item) => {
            const action = (
              <Button
                label="Adicionar"
                icon="add"
                variant="outline"
                size={44}
                disabled={add.isPending}
                accessibilityLabel={`Adicionar ${item.establishment.name} ao roteiro`}
                onPress={() => addPlace(item)}
                testID={`suggestion-add-${item.establishment.id}`}
              />
            )
            return (
              <View
                key={item.establishment.id}
                style={styles.item}
                testID={`suggestion-${item.establishment.id}`}
              >
                <EstablishmentCardRow
                  card={item.establishment}
                  detail={distanceLabel(item.distance_km)}
                  onPress={() =>
                    router.push(placeHref(item.establishment.city_slug, item.establishment.slug))
                  }
                  trailing={stacked ? undefined : action}
                />
                {stacked ? action : null}
              </View>
            )
          })}
        </View>
      )}

      {add.isError ? (
        <Text accessibilityRole="alert" style={[styles.body, { color: colors.destructiveAccent }]}>
          Não foi possível adicionar agora.
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  body: typography.body,
  notice: { gap: spacing.sm },
  list: {
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  item: { gap: spacing.sm },
})
