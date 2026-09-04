import { Image } from 'expo-image'

import { resolveMediaUrl } from '@/api/config'
import { useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { track } from '@/analytics/events'
import { brazilianWhatsApp, dialable } from '@/catalog/contact-links'
import { formatTime, weekdayName } from '@/catalog/opening-hours'
import { useEstablishment } from '@/catalog/queries'
import { isHistorical, type EstablishmentDetail } from '@/catalog/types'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export default function EstablishmentScreen() {
  const colors = useColors()
  const { city, slug } = useLocalSearchParams<{ city: string; slug: string }>()
  const query = useEstablishment(city ?? null, slug ?? null)
  const page = query.data

  // A view is a qualified discovery action and is measured on arrival.
  useEffect(() => {
    if (page && city && slug) {
      track('establishment_view', { city_slug: city, establishment_slug: slug })
    }
  }, [page, city, slug])

  if (query.isPending) {
    return <ActivityIndicator style={styles.center} color={colors.primary} />
  }

  if (query.isError || !page) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.foreground }]}>
          Este lugar não está disponível.
        </Text>
      </View>
    )
  }

  if (isHistorical(page)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.name, { color: colors.foreground }]}>{page.name}</Text>
        <Text style={[styles.message, { color: colors.mutedForeground }]}>{page.message}</Text>
      </View>
    )
  }

  return <Detail detail={page} citySlug={city} colors={colors} />
}

function Detail({
  detail,
  citySlug,
  colors,
}: {
  detail: EstablishmentDetail
  citySlug: string
  colors: ReturnType<typeof useColors>
}) {
  const { contacts, address } = detail

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

  const routeUrl =
    address.latitude != null && address.longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`
      : null

  const actions = [
    { label: 'Como chegar', onPress: open('route_click', routeUrl) },
    {
      label: 'WhatsApp',
      onPress: open('whatsapp_click', (() => {
        const number = brazilianWhatsApp(contacts.whatsapp)
        return number && `https://wa.me/${number}`
      })()),
    },
    {
      label: 'Ligar',
      onPress: open('phone_click', (() => {
        const number = dialable(contacts.phone)
        return number && `tel:${number}`
      })()),
    },
    { label: 'Site', onPress: open('website_click', contacts.website) },
  ].filter((action) => action.onPress)

  const street = [address.street, address.without_number ? 's/n' : address.number]
    .filter(Boolean)
    .join(', ')

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <Image
        source={{ uri: resolveMediaUrl(detail.cover.asset.url) }}
        accessibilityLabel={detail.cover.alt_text}
        style={styles.cover}
        contentFit="cover"
        transition={150}
      />

      <View style={styles.section}>
        <Text style={[styles.name, { color: colors.foreground }]}>{detail.name}</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {[detail.categories.find((item) => item.is_primary)?.name, address.district]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {detail.is_open_now ? (
          <Text style={[styles.open, { color: colors.success }]}>Aberto agora</Text>
        ) : null}
        {detail.is_sponsored ? (
          <Text style={[styles.sponsored, { color: colors.mutedForeground }]}>Patrocinado</Text>
        ) : null}
      </View>

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              onPress={action.onPress}
              style={[styles.action, { backgroundColor: colors.cta }]}>
              <Text style={[styles.actionLabel, { color: colors.ctaForeground }]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {detail.description ? (
        <View style={styles.section}>
          <Text style={[styles.body, { color: colors.foreground }]}>{detail.description}</Text>
        </View>
      ) : null}

      {street ? (
        <View style={styles.section}>
          <Text style={[styles.heading, { color: colors.foreground }]}>Endereço</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            {[street, address.district, `${detail.city.name} · ${detail.city.state_code}`]
              .filter(Boolean)
              .join('\n')}
          </Text>
        </View>
      ) : null}

      {detail.opening_hours.weekly.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.heading, { color: colors.foreground }]}>Horários</Text>
          {detail.opening_hours.weekly.map((hour) => (
            <Text
              key={`${hour.weekday}-${hour.sort_order}`}
              style={[styles.body, { color: colors.mutedForeground }]}>
              {weekdayName(hour.weekday)} · {formatTime(hour.opens_at)} às{' '}
              {formatTime(hour.closes_at)}
              {hour.spans_next_day ? ' (vira o dia)' : ''}
            </Text>
          ))}
        </View>
      ) : null}

      {detail.attributes.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.heading, { color: colors.foreground }]}>Este lugar oferece</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            {detail.attributes
              .filter((attribute) => attribute.value === true)
              .map((attribute) => attribute.name)
              .join(' · ')}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.xxl },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.xxl },
  cover: { height: 220, width: '100%' },
  section: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  name: { ...typography.title },
  meta: typography.caption,
  open: { ...typography.caption, fontWeight: '600' },
  sponsored: { ...typography.caption, fontWeight: '600', textTransform: 'uppercase' },
  heading: { ...typography.heading, marginBottom: spacing.xs },
  body: typography.body,
  message: { ...typography.body, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.lg },
  action: { borderRadius: radius.pill, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  actionLabel: { ...typography.body, fontWeight: '700' },
})
