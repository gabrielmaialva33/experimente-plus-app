import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
import { ChoiceRow } from '@/components/choice-row'
import { ChoiceControl } from '@/components/choice-control'
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
    <SafeAreaView edges={['left', 'right']} style={{ backgroundColor: colors.surfaceBase, flex: 1 }}>
      <View style={[styles.header, { backgroundColor: colors.surfaceBase }]}>
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
        <View style={styles.citySelector}>
          <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>Cidade</Text>
          <ChoiceRow label="Cidade" single>
            {(maxWidth) => cities.data?.map((item) => (
                <ChoiceControl
                  key={item.slug}
                  shape="tab"
                  compact
                  maxWidth={maxWidth}
                  role="radio"
                  accessibilityLabel={`${item.name}, ${item.state_code}`}
                  label={`${item.name} · ${item.state_code}`}
                  selected={item.slug === selectedCity}
                  onPress={() => selectCity(item.slug)}
                />
            ))}
          </ChoiceRow>
        </View>

        {/* One filter state, shared by the list and the map. */}
        <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Filtros</Text>
        <ChoiceRow label="Filtros">
          {(maxWidth) => <>
            <Chip maxWidth={maxWidth} label="Aberto agora" selected={openNow} onPress={() => setOpenNow(!openNow)} />
            {categories.data?.categories.map((item) => (
              <Chip
                key={item.slug}
                maxWidth={maxWidth}
                label={item.name}
                selected={category === item.slug}
                onPress={() => setCategory(category === item.slug ? undefined : item.slug)}
              />
            ))}
            {/* Facets come from the server, so chips are never hardcoded. */}
            {filters.data?.attributes.map((item) => (
              <Chip
                key={item.key}
                maxWidth={maxWidth}
                label={item.name}
                selected={attributes.includes(item.key)}
                onPress={() => toggleAttribute(item.key)}
              />
            ))}
          </>}
        </ChoiceRow>

        <View style={styles.viewToggle}>
          <View accessibilityRole="radiogroup" accessibilityLabel="Visualização dos resultados" style={styles.viewOptions}>
            {(['list', 'map'] as const).map((mode) => (
              <ChoiceControl
                key={mode}
                shape="segment"
                compact
                fill
                role="radio"
                accessibilityLabel={mode === 'list' ? 'Ver em lista' : 'Ver no mapa'}
                label={mode === 'list' ? 'Lista' : 'Mapa'}
                selected={view === mode}
                onPress={() => setView(mode)}
              />
            ))}
          </View>
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
              <Text style={[styles.action, { color: colors.primary }]}>Tentar de novo</Text>
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
                    <Text style={[styles.action, { color: colors.primary }]}>Limpar filtros</Text>
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
  search: {
    ...typography.body,
    borderRadius: radius.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  citySelector: { paddingTop: spacing.sm },
  controlLabel: { ...typography.caption, fontWeight: '600', paddingHorizontal: spacing.lg },
  filterLabel: {
    ...typography.caption,
    fontWeight: '600',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  viewToggle: { paddingVertical: spacing.xs, paddingHorizontal: spacing.lg, width: '100%', minWidth: 0 },
  viewOptions: { flexDirection: 'row', gap: spacing.sm, width: '100%', minWidth: 0, paddingVertical: spacing.xs },
  list: { padding: spacing.lg },
  feedback: { alignItems: 'center', gap: spacing.md, padding: spacing.xxl },
  message: { ...typography.body, textAlign: 'center' },
  action: { ...typography.body, fontWeight: '700' },
})
