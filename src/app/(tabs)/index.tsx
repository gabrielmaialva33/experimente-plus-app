import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { track } from '@/analytics/events'
import type { SearchParams } from '@/api/catalog'
import { selectCity, useSelectedCity } from '@/catalog/city-store'
import { useCategories, useCities, useFilters, useSearch } from '@/catalog/queries'
import { Chip } from '@/components/chip'
import { EstablishmentCard } from '@/components/establishment-card'
import { EstablishmentMap } from '@/components/establishment-map'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/** The server rejects a longer term with 422; clamping keeps that off-screen. */
const MAX_TERM_LENGTH = 120

export default function ExploreScreen() {
  const colors = useColors()
  const router = useRouter()
  const selectedCity = useSelectedCity()

  const [term, setTerm] = useState('')
  // Anonymous discovery is throttled at 20 requests/minute per IP, so an
  // un-debounced field spends the whole budget on a single typed word.
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [category, setCategory] = useState<string | undefined>()
  const [openNow, setOpenNow] = useState(false)
  const [attributes, setAttributes] = useState<string[]>([])
  // List and map are two views of one filter state, never two destinations.
  const [view, setView] = useState<'list' | 'map'>('list')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(term.trim().slice(0, MAX_TERM_LENGTH)), 350)
    return () => clearTimeout(timer)
  }, [term])

  const cities = useCities()

  // The first published city becomes the default until someone chooses one.
  useEffect(() => {
    if (!selectedCity && cities.data?.length) {
      selectCity(cities.data[0].slug)
    }
  }, [selectedCity, cities.data])

  const categories = useCategories(selectedCity)
  const filters = useFilters(selectedCity)

  const params = useMemo<SearchParams>(
    () => ({ q: debouncedTerm || undefined, category, openNow, attributes }),
    [debouncedTerm, category, openNow, attributes]
  )
  const search = useSearch(selectedCity, params)

  const hasFilters = Boolean(category) || openNow || attributes.length > 0
  const clearFilters = () => {
    setCategory(undefined)
    setOpenNow(false)
    setAttributes([])
  }

  const toggleAttribute = (key: string) =>
    setAttributes((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    )

  const city = cities.data?.find((item) => item.slug === selectedCity)

  const selectedCityRef = useRef<string | null>(selectedCity)
  selectedCityRef.current = selectedCity

  // A result impression is only counted once per establishment per session.
  const seen = useRef(new Set<string>())
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { key: string }[] }) => {
      viewableItems.forEach(({ key }) => {
        if (!selectedCityRef.current || seen.current.has(key)) return
        seen.current.add(key)
        track('catalog_impression', {
          city_slug: selectedCityRef.current,
          establishment_slug: key,
        })
      })
    }
  ).current

  // Searches that find nothing are a product signal, not a silent failure.
  const total = search.data?.meta.total
  useEffect(() => {
    if (selectedCity && debouncedTerm && total === 0) {
      track('search_without_results', { city_slug: selectedCity, search_term: debouncedTerm })
    }
  }, [selectedCity, debouncedTerm, total])

  const openEstablishment = useCallback(
    (slug: string) => router.push(`/estabelecimento/${selectedCity}/${slug}`),
    [router, selectedCity]
  )

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.primary, flex: 1 }}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={[styles.city, { color: colors.primaryForeground }]}>
          {city ? `${city.name} · ${city.state_code}` : 'Escolha uma cidade'}
        </Text>

        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Buscar lugares"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="search"
          maxLength={MAX_TERM_LENGTH}
          style={[styles.search, { backgroundColor: colors.card, color: colors.foreground }]}
        />
      </View>

      <View style={{ backgroundColor: colors.background, flex: 1 }}>
        {/* Changing city is discovery state only: no tenant request, no token. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
          <View style={styles.rowInner}>
            {cities.data?.map((item) => (
              <Chip
                key={item.slug}
                label={item.name}
                selected={item.slug === selectedCity}
                onPress={() => selectCity(item.slug)}
              />
            ))}
          </View>
        </ScrollView>

        {/* One filter state, shared by the list and — later — the map. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
          <View style={styles.rowInner}>
            <Chip label="Aberto agora" selected={openNow} onPress={() => setOpenNow(!openNow)} />
            {categories.data?.categories.map((item) => (
              <Chip
                key={item.slug}
                label={item.name}
                selected={category === item.slug}
                onPress={() => setCategory(category === item.slug ? undefined : item.slug)}
              />
            ))}
            {/* Facets come from the server, so chips are never hardcoded. */}
            {filters.data?.attributes.map((item) => (
              <Chip
                key={item.key}
                label={item.name}
                selected={attributes.includes(item.key)}
                onPress={() => toggleAttribute(item.key)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.viewToggle}>
          <Chip
            label={view === 'list' ? 'Ver no mapa' : 'Ver em lista'}
            onPress={() => setView(view === 'list' ? 'map' : 'list')}
          />
        </View>

        {search.isPending ? (
          <ActivityIndicator style={styles.feedback} color={colors.primary} />
        ) : search.isError ? (
          <View style={styles.feedback}>
            <Text style={[styles.message, { color: colors.foreground }]}>
              Não foi possível carregar agora.
            </Text>
            {/* Manual retry preserving the filters, per the retry contract. */}
            <Pressable onPress={() => search.refetch()}>
              <Text style={[styles.action, { color: colors.cta }]}>Tentar de novo</Text>
            </Pressable>
          </View>
        ) : view === 'map' ? (
          <EstablishmentMap
            establishments={search.data?.organic ?? []}
            fallbackCenter={
              city?.coordinates.latitude != null && city.coordinates.longitude != null
                ? { latitude: city.coordinates.latitude, longitude: city.coordinates.longitude }
                : null
            }
            onSelect={openEstablishment}
          />
        ) : (
          <FlatList
            data={search.data?.organic ?? []}
            keyExtractor={(item) => item.slug}
            contentContainerStyle={styles.list}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            renderItem={({ item }) => (
              <EstablishmentCard
                establishment={item}
                onPress={() => openEstablishment(item.slug)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.feedback}>
                <Text style={[styles.message, { color: colors.foreground }]}>
                  {hasFilters
                    ? `Nada encontrado em ${city?.name ?? 'sua cidade'} com esses filtros.`
                    : `Ainda não há lugares publicados em ${city?.name ?? 'sua cidade'}.`}
                </Text>
                {hasFilters ? (
                  <Pressable onPress={clearFilters}>
                    <Text style={[styles.action, { color: colors.cta }]}>Limpar filtros</Text>
                  </Pressable>
                ) : null}
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg },
  city: { ...typography.heading, fontWeight: '700' },
  search: {
    ...typography.body,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: { flexGrow: 0 },
  viewToggle: { alignItems: 'flex-start', paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  rowInner: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  list: { padding: spacing.lg },
  feedback: { alignItems: 'center', gap: spacing.md, padding: spacing.xxl },
  message: { ...typography.body, textAlign: 'center' },
  action: { ...typography.body, fontWeight: '700' },
})
