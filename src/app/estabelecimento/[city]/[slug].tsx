import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef } from 'react'
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { ContentSkeleton } from '@/components/content-skeleton'
import { track } from '@/analytics/events'
import { brazilianWhatsApp, dialable, instagramProfile, mailto } from '@/catalog/contact-links'
import { useEstablishment } from '@/catalog/queries'
import { isHistorical, type EstablishmentDetail } from '@/catalog/types'
import { Badge } from '@/components/badge'
import { OperatingStatus } from '@/components/operating-status'
import { SectionHeader } from '@/components/section-header'
import { EstablishmentPartnerContent } from '@/partner-content/establishment-content'
import { PlaceBenefits } from '@/place/benefit-ticket'
import { HIGHLIGHT_PARAM } from '@/place/links'
import { PlaceActions } from '@/place/place-actions'
import { PlaceHero } from '@/place/place-hero'
import { PracticalInfo, type ContactAction } from '@/place/practical-info'
import { EstablishmentReviews } from '@/reviews/establishment-reviews'
import { Stars, ratingLabel } from '@/reviews/stars'
import { displayWeight, radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export default function EstablishmentScreen() {
  const colors = useColors()
  const params = useLocalSearchParams<{ city: string; slug: string; [HIGHLIGHT_PARAM]?: string }>()
  const { city, slug } = params
  const query = useEstablishment(city ?? null, slug ?? null)
  const page = query.data

  // A view is a qualified discovery action and is measured on arrival.
  useEffect(() => {
    if (page && city && slug) {
      track('establishment_view', { city_slug: city, establishment_slug: slug })
    }
  }, [page, city, slug])

  // The header names the place or stays empty — never a generic "Estabelecimento"
  // (audit A40). A place that loads draws its own chrome over the photo.
  if (query.isPending) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <ContentSkeleton label="Carregando lugar" variant="catalog" />
      </>
    )
  }

  if (query.isError || !page) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: '' }} />
        <Text style={[styles.message, { color: colors.foreground }]}>
          Este lugar não está disponível.
        </Text>
      </View>
    )
  }

  if (isHistorical(page)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: page.name }} />
        <Text style={[styles.name, { color: colors.foreground }]}>{page.name}</Text>
        <OperatingStatus establishment={{ ...page, is_open_now: false }} />
        <Text style={[styles.message, { color: colors.mutedForeground }]}>{page.message}</Text>
      </View>
    )
  }

  return <Detail detail={page} citySlug={city} highlight={params[HIGHLIGHT_PARAM] ?? null} colors={colors} />
}

function Detail({
  detail,
  citySlug,
  highlight,
  colors,
}: {
  detail: EstablishmentDetail
  citySlug: string
  /** An experience or event the link asked to bring into view (audit A14). */
  highlight: string | null
  colors: ReturnType<typeof useColors>
}) {
  const { contacts, address } = detail
  const scroll = useRef<ScrollView>(null)
  // Offsets inside the scroll content, measured as the sections lay out.
  const offsets = useRef({ body: null as number | null, reviews: null as number | null, highlight: null as number | null })
  const arrived = useRef(false)

  const scrollTo = (section: number | null, animated = true) => {
    if (offsets.current.body === null || section === null) return false
    scroll.current?.scrollTo({ y: Math.max(0, offsets.current.body + section - spacing.lg), animated })
    return true
  }
  // Once, when both the page body and the item have a place on screen.
  const bringHighlightIntoView = () => {
    if (!arrived.current && scrollTo(offsets.current.highlight)) arrived.current = true
  }

  /**
   * Conversion actions.
   *
   * The event is recorded and the native intent is opened directly. The web's
   * tracked `/go/:city/:slug/:action` redirect is deliberately not reused here:
   * on a device it would bounce the person through a browser before reaching
   * WhatsApp or the map.
   */
  const open = (
    event: Parameters<typeof track>[0],
    url: string | null | undefined
  ): (() => void) | undefined => {
    if (!url) return undefined

    return () => {
      track(event, { city_slug: citySlug, establishment_slug: detail.slug })
      void Linking.openURL(url)
    }
  }

  // The analytics contract has no e-mail or Instagram event; these open untracked
  // rather than inventing one the server would refuse.
  const openUntracked = (url: string | null): (() => void) | undefined =>
    url ? () => void Linking.openURL(url) : undefined

  const routeUrl =
    address.latitude != null && address.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`
      : null

  const actions = [
    { label: 'Como chegar', icon: 'navigate-outline' as const, onPress: open('route_click', routeUrl) },
    {
      label: 'WhatsApp', icon: 'logo-whatsapp' as const,
      onPress: open('whatsapp_click', (() => {
        const number = brazilianWhatsApp(contacts.whatsapp)
        return number && `https://wa.me/${number}`
      })()),
    },
    {
      label: 'Ligar', icon: 'call-outline' as const,
      onPress: open('phone_click', (() => {
        const number = dialable(contacts.phone)
        return number && `tel:${number}`
      })()),
    },
    { label: 'Site', icon: 'globe-outline' as const, onPress: open('website_click', contacts.website) },
    { label: 'E-mail', icon: 'mail-outline' as const, onPress: openUntracked(mailto(contacts.email)) },
    { label: 'Instagram', icon: 'logo-instagram' as const, onPress: openUntracked(instagramProfile(contacts.instagram)) },
  ].filter((action) => action.onPress !== undefined) as ContactAction[]
  // Visiting is the primary discovery conversion. Without coordinates, promote
  // the first available contact rather than offering an unusable route; the
  // rest are rows of the practical block.
  const [primaryAction, ...secondaryActions] = actions

  const category = detail.categories.find((item) => item.is_primary)?.name
  const average = detail.reviews.average

  return (
    <ScrollView ref={scroll} style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <Stack.Screen options={{ headerShown: false, title: detail.name }} />
      <PlaceHero detail={detail} citySlug={citySlug} />

      <View
        style={[styles.body, { backgroundColor: colors.background }]}
        testID="place-body"
        onLayout={(event) => {
          offsets.current.body = event.nativeEvent.layout.y
          bringHighlightIntoView()
        }}>
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
                hitSlop={spacing.sm}
                style={styles.rating}>
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
          <Text style={[styles.description, { color: colors.foreground }]}>{detail.description}</Text>
        ) : null}

        <PracticalInfo detail={detail} contacts={secondaryActions} />

        {detail.attributes.some((attribute) => attribute.value === true) ? (
          <View style={styles.section}>
            <SectionHeader title="Este lugar oferece" />
            <View style={styles.attributes}>
              {detail.attributes
                .filter((attribute) => attribute.value === true)
                .map((attribute) => (
                  <Badge key={attribute.name} label={attribute.name} />
                ))}
            </View>
          </View>
        ) : null}

        <View
          onLayout={(event) => {
            offsets.current.reviews = event.nativeEvent.layout.y
          }}>
          <EstablishmentReviews
            establishmentId={detail.id}
            establishmentName={detail.name}
            summary={detail.reviews}
          />
        </View>

        <EstablishmentPartnerContent
          establishmentId={detail.id}
          timeZone={detail.city.timezone}
          establishmentName={detail.name}
          citySlug={citySlug}
          establishmentSlug={detail.slug}
          highlight={highlight}
          onHighlightLayout={(y) => {
            offsets.current.highlight = y
            bringHighlightIntoView()
          }}
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.xxl },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.xxl },
  // The content rises over the photo on a sheet with rounded top corners.
  body: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    gap: spacing.section,
    marginTop: -radius.sheet,
    paddingHorizontal: spacing.gutter,
    paddingTop: 22,
  },
  header: { gap: 10 },
  meta: { ...typography.meta, ...textWeight('600') },
  name: { ...typography.display, ...displayWeight('800') },
  signals: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rating: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 32 },
  ratingLabel: typography.label,
  description: typography.body,
  section: { gap: spacing.md },
  attributes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  message: { ...typography.body, textAlign: 'center' },
})
