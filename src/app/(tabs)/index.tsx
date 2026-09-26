import Ionicons from '@expo/vector-icons/Ionicons'
import { useFocusEffect, useRouter } from 'expo-router'
import { setStatusBarStyle } from 'expo-status-bar'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { ContentSkeleton } from '@/components/content-skeleton'
import { track } from '@/analytics/events'
import type { SearchParams } from '@/api/catalog'
import { CityAgenda } from '@/catalog/city-agenda'
import { selectCity, useSelectedCity } from '@/catalog/city-store'
import { useCategories, useCities, useFilters, useSearch } from '@/catalog/queries'
import type { EstablishmentSummary } from '@/catalog/types'
import { ChoiceRow } from '@/components/choice-row'
import { ChoiceControl } from '@/components/choice-control'
import { Chip } from '@/components/chip'
import { EstablishmentCard } from '@/components/establishment-card'
import { EstablishmentMap } from '@/components/establishment-map'
import { usePullToRefresh } from '@/components/pull-to-refresh'
import { ScreenHeader } from '@/components/screen-header'
import { SearchField } from '@/components/search-field'
import { SectionHeader } from '@/components/section-header'
import { DiscoveryAssistant } from '@/concierge/discovery-assistant'
import { ForYouRow } from '@/explorer/for-you-row'
import { displayWeight, minTouch, radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/** The server rejects a longer term with 422; clamping keeps that off-screen. */
const MAX_TERM_LENGTH = 120

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export default function ExploreScreen() {
  const colors = useColors()
  const router = useRouter()
  const insets = useSafeAreaInsets()
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
  const [choosingCity, setChoosingCity] = useState(false)
  const [asking, setAsking] = useState(false)
  const list = useRef<FlatList<EstablishmentSummary>>(null)

  // The band runs under the status bar, so its icons stay light while Explorar is in front.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light')
      return () => setStatusBarStyle('auto')
    }, [])
  )

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
  // A pull asks again for the results alone: one request against the anonymous limit.
  const refreshControl = usePullToRefresh(search.refetch)

  // New criteria bring the results, right under the controls, back into view.
  const criteriaChanged = useRef(false)
  useEffect(() => {
    if (!criteriaChanged.current) {
      criteriaChanged.current = true
      return
    }
    list.current?.scrollToOffset({ offset: 0, animated: true })
  }, [params])

  const activeFilters = [
    category ? categories.data?.categories.find((item) => item.slug === category)?.name ?? category : null,
    openNow ? 'Aberto agora' : null,
    ...attributes.map((key) => filters.data?.attributes.find((item) => item.key === key)?.name ?? key),
  ].filter(Boolean)
  const hasFilters = debouncedTerm !== '' || activeFilters.length > 0
  const clearFilters = () => {
    setTerm('')
    setDebouncedTerm('')
    setCategory(undefined)
    setOpenNow(false)
    setAttributes([])
  }

  const toggleAttribute = (key: string) =>
    setAttributes((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    )

  const city = cities.data?.find((item) => item.slug === selectedCity)
  const cityName = city?.name ?? 'sua cidade'

  const selectedCityRef = useRef<string | null>(selectedCity)
  useEffect(() => {
    selectedCityRef.current = selectedCity
  }, [selectedCity])

  // A result impression is only counted once per establishment per session.
  const seen = useRef(new Set<string>())
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { key: string }[] }) => {
      viewableItems.forEach(({ key }) => {
        if (!selectedCityRef.current || seen.current.has(key)) return
        seen.current.add(key)
        track('catalog_impression', {
          city_slug: selectedCityRef.current,
          establishment_slug: key,
        })
      })
    },
    []
  )

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

  const results = search.data?.organic ?? []
  const count = search.data ? total ?? results.length : null

  // Changing city is discovery state only: no tenant request, no token.
  const brand = (
    <>
      <View style={styles.brandRow}>
        <Text style={[styles.wordmark, { color: colors.chromeForeground }]}>Experimente+</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cidade: ${city?.name ?? 'nenhuma'}. Trocar cidade`}
          accessibilityState={{ expanded: choosingCity }}
          onPress={() => setChoosingCity(!choosingCity)}
          style={({ pressed }) => [
            styles.cityButton,
            { backgroundColor: colors.chromeRaised, opacity: pressed ? 0.85 : 1 },
          ]}>
          <Ionicons name="location-outline" size={18} color={colors.chromeForeground} />
          <Text numberOfLines={1} style={[styles.cityName, { color: colors.chromeForeground }]}>
            {city?.name ?? 'Cidade'}
          </Text>
          <Ionicons name={choosingCity ? 'chevron-up' : 'chevron-down'} size={16} color={colors.chromeForeground} />
        </Pressable>
      </View>
      {choosingCity ? (
        <View style={[styles.cityPanel, { backgroundColor: colors.card }]}>
          <Text style={[styles.panelLabel, { color: colors.mutedForeground }]}>Cidade</Text>
          <ChoiceRow label="Cidade" single>
            {(maxWidth) => cities.data?.map((item) => (
              <ChoiceControl
                key={item.slug}
                maxWidth={maxWidth}
                role="radio"
                accessibilityLabel={`${item.name}, ${item.state_code}`}
                label={`${item.name} · ${item.state_code}`}
                selected={item.slug === selectedCity}
                onPress={() => {
                  selectCity(item.slug)
                  setChoosingCity(false)
                }}
              />
            ))}
          </ChoiceRow>
        </View>
      ) : null}
    </>
  )

  const searchField = (
    <SearchField
      value={term}
      onChangeText={setTerm}
      placeholder="Buscar lugares"
      maxLength={MAX_TERM_LENGTH}
    />
  )

  // One filter state, shared by the list and the map.
  const filterControls = (
    <View style={styles.filters}>
      <ChoiceRow label="Filtros" gutter={spacing.gutter}>
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
    </View>
  )

  // A search answers first with how much it found, then with the places (audit A16).
  const resultsHeader = (
    <View style={styles.resultsHeader}>
      <SectionHeader
        title={
          !hasFilters
            ? `Lugares em ${cityName}`
            : count == null
              ? `Resultados em ${cityName}`
              : count === 0
                ? `Nenhum resultado em ${cityName}`
                : `${plural(count, 'resultado', 'resultados')} em ${cityName}`
        }
        hint={
          !hasFilters
            ? count ? plural(count, 'lugar', 'lugares') : null
            : count
              ? [debouncedTerm ? `“${debouncedTerm}”` : null, ...activeFilters].filter(Boolean).join(' · ')
              : null
        }
        action={
          view === 'list'
            ? { label: 'Ver no mapa', icon: 'map-outline', onPress: () => setView('map') }
            : { label: 'Ver em lista', icon: 'list-outline', onPress: () => setView('list') }
        }
      />
    </View>
  )

  const feedback = search.isPending ? (
    <ContentSkeleton label="Carregando lugares" variant="catalog" />
  ) : search.isError ? (
    <View style={styles.feedback}>
      <Text style={[styles.message, { color: colors.foreground }]}>
        Não foi possível carregar agora.
      </Text>
      {/* Manual retry preserving the filters, per the retry contract. */}
      <Pressable accessibilityRole="button" onPress={() => search.refetch()} style={styles.feedbackAction}>
        <Text style={[styles.action, { color: colors.primary }]}>Tentar de novo</Text>
      </Pressable>
    </View>
  ) : !results.length ? (
    <View testID="catalog-empty" style={styles.feedback}>
      <Text style={[styles.message, { color: colors.foreground }]}>
        {hasFilters
          ? [
              'Nada encontrado',
              debouncedTerm ? `para “${debouncedTerm}”` : null,
              `em ${cityName}`,
              activeFilters.length ? `com os filtros: ${activeFilters.join(', ')}` : null,
            ].filter(Boolean).join(' ') + '.'
          : `Ainda não há lugares publicados em ${cityName}.`}
      </Text>
      {hasFilters ? (
        <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.feedbackAction}>
          <Text style={[styles.action, { color: colors.primary }]}>Limpar filtros</Text>
        </Pressable>
      ) : null}
    </View>
  ) : null

  // The Concierge waits folded as one card; opening it keeps the city it was asked in.
  const concierge = asking ? (
    <DiscoveryAssistant
      key={selectedCity ?? 'no-city'}
      citySlug={selectedCity}
      cityName={city?.name ?? null}
    />
  ) : (
    <View style={styles.gutter}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Perguntar ao Concierge"
        accessibilityHint={`Conte o que procura e o Concierge sugere lugares em ${cityName}.`}
        onPress={() => setAsking(true)}
        style={({ pressed }) => [styles.concierge, { backgroundColor: colors.primarySoft, opacity: pressed ? 0.9 : 1 }]}>
        <View style={[styles.conciergeIcon, { backgroundColor: colors.primary }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primaryForeground} />
        </View>
        <View style={styles.conciergeCopy}>
          <Text style={[styles.conciergeTitle, { color: colors.primaryAccent }]}>Não sabe por onde começar?</Text>
          <Text style={[styles.conciergeText, { color: colors.foreground }]}>
            Conte o que procura e o Concierge sugere lugares daqui.
          </Text>
        </View>
        <View style={[styles.conciergeGo, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-forward" size={20} color={colors.primaryAccent} />
        </View>
      </Pressable>
    </View>
  )

  return (
    <SafeAreaView edges={['left', 'right']} style={{ backgroundColor: colors.background, flex: 1 }}>
      {view === 'map' ? (
        // The map keeps the whole remaining height: nested in the scrolling feed it
        // would lose vertical pans to the page on Android, so the feed stays in the list.
        <View style={styles.fill}>
          <ScreenHeader eyebrow={brand}>{searchField}</ScreenHeader>
          {filterControls}
          {resultsHeader}
          {feedback ? (
            <ScrollView contentContainerStyle={styles.mapFeedback} keyboardShouldPersistTaps="handled">
              {feedback}
            </ScrollView>
          ) : (
            <EstablishmentMap
              establishments={results}
              fallbackCenter={
                city?.coordinates.latitude != null && city.coordinates.longitude != null
                  ? { latitude: city.coordinates.latitude, longitude: city.coordinates.longitude }
                  : null
              }
              onSelect={openEstablishment}
            />
          )}
        </View>
      ) : (
        <View style={styles.fill}>
          {/* The band scrolls with the feed; the status bar keeps its colour. */}
          <View style={{ backgroundColor: colors.chrome, height: insets.top }} />
          {/* One scroll for the whole feed: the band, the controls, the places and
              the editorial rows move together, so no fixed block eats the phone. */}
          <FlatList
            ref={list}
            style={styles.fill}
            data={feedback ? [] : results}
            keyExtractor={(item) => item.slug}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            refreshControl={refreshControl}
            ListHeaderComponent={
              <>
                <ScreenHeader
                  insetTop={false}
                  eyebrow={brand}
                  title="O que você quer experimentar hoje?">
                  {searchField}
                </ScreenHeader>
                {filterControls}
                {resultsHeader}
              </>
            }
            ListEmptyComponent={feedback}
            // A search shows its results alone; the editorial rows come back with the browse.
            ListFooterComponent={
              hasFilters ? null : (
                <View style={styles.editorial}>
                  {/* The only personal piece of the feed; it reads the session itself. */}
                  <ForYouRow citySlug={selectedCity} />
                  {/* Bands already resolved in the city's timezone by the server. */}
                  <CityAgenda citySlug={selectedCity} />
                  {concierge}
                </View>
              )
            }
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            renderItem={({ item }) => (
              <View style={styles.gutter}>
                <EstablishmentCard
                  establishment={item}
                  onPress={() => openEstablishment(item.slug)}
                />
              </View>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  gutter: { paddingHorizontal: spacing.gutter },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  wordmark: { ...typography.heading, ...displayWeight('800'), fontSize: 20, letterSpacing: -0.4 },
  cityButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 6,
    minHeight: minTouch,
    paddingLeft: spacing.md,
    paddingRight: 14,
  },
  cityName: { ...typography.label, flexShrink: 1 },
  cityPanel: { borderRadius: radius.card, gap: spacing.xs, paddingTop: spacing.md, paddingBottom: spacing.xs },
  panelLabel: { ...typography.overline, paddingHorizontal: spacing.lg },
  filters: { paddingTop: spacing.sm },
  resultsHeader: { paddingBottom: spacing.sm, paddingHorizontal: spacing.gutter, paddingTop: spacing.xs },
  list: { paddingBottom: spacing.section },
  editorial: { gap: spacing.section, paddingTop: spacing.md },
  mapFeedback: { flexGrow: 1 },
  feedback: { alignItems: 'center', gap: spacing.md, padding: spacing.xxl },
  feedbackAction: { justifyContent: 'center', minHeight: minTouch },
  message: { ...typography.body, textAlign: 'center' },
  action: { ...typography.label, ...textWeight('700') },
  concierge: { alignItems: 'center', borderRadius: radius.card, flexDirection: 'row', gap: 14, padding: 18 },
  conciergeIcon: { alignItems: 'center', borderRadius: radius.pill, height: 48, justifyContent: 'center', width: 48 },
  conciergeCopy: { flex: 1, gap: 2, minWidth: 0 },
  conciergeTitle: { ...typography.label, ...textWeight('700'), fontSize: 16, lineHeight: 21 },
  conciergeText: typography.meta,
  conciergeGo: { alignItems: 'center', borderRadius: radius.pill, height: minTouch, justifyContent: 'center', width: minTouch },
})
