import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { Linking, Pressable, StyleSheet, Text, View, type ScrollView } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ContentSkeleton } from '@/components/content-skeleton'
import { track } from '@/analytics/events'
import { ApiError } from '@/api/client'
import {
  brazilianWhatsApp,
  dialable,
  instagramProfile,
  mailto,
  webAddress,
} from '@/catalog/contact-links'
import { useEstablishment } from '@/catalog/queries'
import { isHistorical, type EstablishmentDetail } from '@/catalog/types'
import { announce } from '@/components/announce'
import { Badge } from '@/components/badge'
import { useCompactHeader } from '@/components/compact-header'
import { MEASURE, useContentFrame } from '@/components/content-frame'
import { EmptyState } from '@/components/empty-state'
import { TROUBLESHOOTING_HELP } from '@/help/help-link'
import { OperatingStatus } from '@/components/operating-status'
import { SectionHeader } from '@/components/section-header'
import { EstablishmentPartnerContent } from '@/partner-content/establishment-content'
import { PlaceBenefits } from '@/place/benefit-ticket'
import { HIGHLIGHT_PARAM, highlightParam, publicSlug } from '@/place/links'
import { PlaceActions } from '@/place/place-actions'
import { PlaceChrome, PlaceHero, offsetBelowBar, placeBarRange } from '@/place/place-hero'
import { PracticalInfo, type ContactAction } from '@/place/practical-info'
import { EstablishmentReviews } from '@/reviews/establishment-reviews'
import { Stars, ratingLabel } from '@/reviews/stars'
import { displayWeight, minTouch, radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export default function EstablishmentScreen() {
  const colors = useColors()
  const router = useRouter()
  const params = useLocalSearchParams<{ city: string; slug: string; [HIGHLIGHT_PARAM]?: string }>()
  // A link is outside input: only the slugs the public catalogue accepts reach a request.
  const city = publicSlug(params.city)
  const slug = publicSlug(params.slug)
  const query = useEstablishment(city, slug)
  const page = query.data

  // A view is a qualified discovery action and is measured on arrival, once:
  // a refetch that brings a changed page is the same visit.
  const viewed = useRef<string | null>(null)
  useEffect(() => {
    const place = `${city}/${slug}`
    if (page && city && slug && viewed.current !== place) {
      viewed.current = place
      track('establishment_view', { city_slug: city, establishment_slug: slug })
    }
  }, [page, city, slug])

  // A malformed link names no place: it is answered as one that left the
  // catalogue, without asking the server (a disabled query would wait forever).
  const malformed = !city || !slug

  // The header names the place or stays empty — never the generic "Lugar"
  // (audit A40). A place that loads draws its own chrome over the photo.
  if (!malformed && query.isPending) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <ContentSkeleton label="Carregando lugar" variant="catalog" />
      </>
    )
  }

  // A place that left the catalogue and a request that failed are different
  // answers: the first leads back to Explorar, the second offers another try.
  // Before, both said "não está disponível", with nothing to do but go back.
  if (malformed || query.isError || !page) {
    const gone = malformed || (query.error instanceof ApiError && query.error.status === 404)
    return (
      <View style={[styles.state, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: '' }} />
        {gone ? (
          <EmptyState
            testID="place-gone"
            icon="storefront-outline"
            title="Este lugar não está mais disponível"
            text="Ele pode ter saído do catálogo, ou o link está incompleto."
            action={{ label: 'Explorar lugares', onPress: () => router.navigate('/') }}
          />
        ) : (
          <EmptyState
            testID="place-failed"
            icon="cloud-offline-outline"
            title="Não foi possível carregar este lugar"
            text="Confira a conexão e tente de novo."
            action={{ label: 'Tentar de novo', onPress: () => void query.refetch() }}
            help={TROUBLESHOOTING_HELP}
          />
        )}
      </View>
    )
  }

  if (isHistorical(page)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: page.name }} />
        <Text accessibilityRole="header" style={[styles.name, { color: colors.foreground }]}>
          {page.name}
        </Text>
        <OperatingStatus establishment={{ ...page, is_open_now: false }} />
        <Text style={[styles.message, { color: colors.mutedForeground }]}>{page.message}</Text>
      </View>
    )
  }

  return (
    <Detail
      detail={page}
      citySlug={city}
      highlight={highlightParam(params[HIGHLIGHT_PARAM])}
      colors={colors}
    />
  )
}

function Detail({
  detail,
  citySlug,
  highlight,
  colors,
}: {
  detail: EstablishmentDetail
  citySlug: string
  /** An experience or event the link asked to show (audit A14). */
  highlight: string | null
  colors: ReturnType<typeof useColors>
}) {
  const { contacts, address } = detail
  const insets = useSafeAreaInsets()
  // The photo spans the window; what the page says keeps to a readable column.
  const frame = useContentFrame()
  const scroll = useRef<ScrollView>(null)
  // Once the photo scrolls away, a compact bar keeps back and the place's name on screen.
  const header = useCompactHeader(...placeBarRange(detail, insets.top))
  // Offsets inside the scroll content, measured as the sections lay out.
  const offsets = useRef({
    body: null as number | null,
    reviews: null as number | null,
  })
  // Brought just below the compact bar, which covers the page's top by then.
  const scrollTo = (section: number | null) => {
    if (offsets.current.body === null || section === null) return
    scroll.current?.scrollTo({
      y: offsetBelowBar(offsets.current.body + section, insets.top),
      animated: true,
    })
  }

  /**
   * Conversion actions.
   *
   * The event is recorded and the native intent is opened directly. The web's
   * tracked `/go/:city/:slug/:action` redirect is deliberately not reused here:
   * on a device it would bounce the person through a browser before reaching
   * WhatsApp or the map.
   */
  // A device may have nothing to open a link with — no dialler on a tablet, no
  // mail app — and the promise rejects: the person hears why nothing happened.
  const launch = (url: string, label: string) =>
    Linking.openURL(url).catch(() => announce(`Não foi possível abrir ${label} neste aparelho.`))

  const open = (
    event: Parameters<typeof track>[0],
    url: string | null | undefined,
    label: string
  ): (() => void) | undefined => {
    if (!url) return undefined

    return () => {
      track(event, { city_slug: citySlug, establishment_slug: detail.slug })
      void launch(url, label)
    }
  }

  // The analytics contract has no e-mail or Instagram event; these open untracked
  // rather than inventing one the server would refuse.
  const openUntracked = (url: string | null, label: string): (() => void) | undefined =>
    url ? () => void launch(url, label) : undefined

  const routeUrl =
    address.latitude != null && address.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`
      : null

  const whatsapp = brazilianWhatsApp(contacts.whatsapp)
  const phone = dialable(contacts.phone)
  const candidates: (Omit<ContactAction, 'onPress'> & { onPress?: () => void })[] = [
    {
      label: 'Como chegar',
      icon: 'navigate-outline',
      onPress: open('route_click', routeUrl, 'o mapa'),
    },
    {
      label: 'WhatsApp',
      icon: 'logo-whatsapp',
      onPress: open('whatsapp_click', whatsapp && `https://wa.me/${whatsapp}`, 'o WhatsApp'),
    },
    {
      label: 'Ligar',
      icon: 'call-outline',
      onPress: open('phone_click', phone && `tel:${phone}`, 'a ligação'),
    },
    {
      label: 'Site',
      icon: 'globe-outline',
      onPress: open('website_click', webAddress(contacts.website), 'o site'),
    },
    {
      label: 'E-mail',
      icon: 'mail-outline',
      onPress: openUntracked(mailto(contacts.email), 'o e-mail'),
    },
    {
      label: 'Instagram',
      icon: 'logo-instagram',
      onPress: openUntracked(instagramProfile(contacts.instagram), 'o Instagram'),
    },
  ]
  const actions = candidates.filter((action): action is ContactAction => Boolean(action.onPress))
  // Visiting is the primary discovery conversion. Without coordinates, promote
  // the first available contact rather than offering an unusable route; the
  // rest are rows of the practical block.
  const [primaryAction, ...secondaryActions] = actions

  const category = detail.categories.find((item) => item.is_primary)?.name
  const average = detail.reviews.average

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false, title: detail.name }} />
      <PlaceChrome detail={detail} citySlug={citySlug} header={header} />
      <Animated.ScrollView
        ref={scroll}
        testID="place-scroll"
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.page}
      >
        <PlaceHero detail={detail} />

        <View
          style={[styles.body, frame.padding, { backgroundColor: colors.background }]}
          testID="place-body"
          onLayout={(event) => {
            offsets.current.body = event.nativeEvent.layout.y
          }}
        >
          <View style={styles.header}>
            {category || address.district ? (
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {[category, address.district].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            <Text accessibilityRole="header" style={[styles.name, { color: colors.foreground }]}>
              {detail.name}
            </Text>
            <View style={styles.signals}>
              {average !== null && detail.reviews.count > 0 ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Nota ${ratingLabel(average)}, ${detail.reviews.count === 1 ? '1 avaliação' : `${detail.reviews.count} avaliações`}`}
                  onPress={() => scrollTo(offsets.current.reviews)}
                  style={styles.rating}
                  testID="place-rating"
                >
                  <Stars rating={average} />
                  <Text style={[styles.ratingLabel, { color: colors.foreground }]}>
                    {`${average.toFixed(1).replace('.', ',')} · ${detail.reviews.count === 1 ? '1 avaliação' : `${detail.reviews.count} avaliações`}`}
                  </Text>
                </Pressable>
              ) : null}
              <OperatingStatus establishment={detail} />
              {detail.is_sponsored ? <Badge label="Patrocinado" /> : null}
            </View>
            <PlaceActions establishmentId={detail.id} name={detail.name} primary={primaryAction} />
          </View>

          <PlaceBenefits citySlug={citySlug} slug={detail.slug} timeZone={detail.city.timezone} />

          {detail.description ? (
            <Text style={[styles.description, { color: colors.foreground }]}>
              {detail.description}
            </Text>
          ) : null}

          {/* What the place offers comes before how to reach it and what others said:
              it is the reason to go, and where a link to one of its items arrives. */}
          <EstablishmentPartnerContent
            establishmentId={detail.id}
            timeZone={detail.city.timezone}
            establishmentName={detail.name}
            citySlug={citySlug}
            establishmentSlug={detail.slug}
            highlight={highlight}
          />

          <PracticalInfo detail={detail} contacts={secondaryActions} />

          {detail.attributes.some((attribute) => attribute.value === true) ? (
            <View style={styles.section}>
              <SectionHeader title="Este lugar oferece" />
              <View style={styles.attributes}>
                {detail.attributes
                  .filter((attribute) => attribute.value === true)
                  .map((attribute) => (
                    <Badge key={attribute.key} label={attribute.name} />
                  ))}
              </View>
            </View>
          ) : null}

          <View
            testID="place-reviews"
            onLayout={(event) => {
              offsets.current.reviews = event.nativeEvent.layout.y
            }}
          >
            <EstablishmentReviews
              establishmentId={detail.id}
              establishmentName={detail.name}
              summary={detail.reviews}
            />
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  )
}

/** How far the 44 rating target reaches past the 32 row it sits in, above and below. */
const RATING_BLEED = (minTouch - 32) / 2

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { paddingBottom: spacing.xxl },
  state: { flex: 1, justifyContent: 'center', padding: spacing.gutter },
  center: {
    alignItems: 'center',
    alignSelf: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    maxWidth: MEASURE.readable,
    padding: spacing.xxl,
  },
  // The content rises over the photo on a sheet with rounded top corners.
  body: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    gap: spacing.section,
    marginTop: -radius.sheet,
    paddingTop: 22,
  },
  header: { gap: 10 },
  meta: { ...typography.meta, ...textWeight('600') },
  name: { ...typography.display, ...displayWeight('800') },
  // The rating link is a 44 target drawn in a 32 row: its extra height and the row's are
  // taken back by negative margins, so the header keeps its rhythm and the whole target
  // stays inside its parent, where Android delivers the touch.
  signals: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginVertical: -RATING_BLEED,
    paddingVertical: RATING_BLEED,
  },
  rating: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginVertical: -RATING_BLEED,
    minHeight: minTouch,
  },
  ratingLabel: typography.label,
  description: typography.body,
  section: { gap: spacing.md },
  attributes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  message: { ...typography.body, textAlign: 'center' },
})
