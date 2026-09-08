import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { track } from '@/analytics/events'
import { brazilianWhatsApp, dialable } from '@/catalog/contact-links'
import { useEstablishment } from '@/catalog/queries'
import { isHistorical, type EstablishmentDetail } from '@/catalog/types'
import { EstablishmentCover } from '@/components/establishment-cover'
import { EstablishmentHours } from '@/components/establishment-hours'
import { OperatingStatus } from '@/components/operating-status'
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
        <OperatingStatus establishment={{ ...page, is_open_now: false }} />
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
  ].filter((action) => action.onPress)
  // Visiting is the primary discovery conversion. Without coordinates, promote
  // the first available contact rather than offering an unusable route.
  const [primaryAction, ...secondaryActions] = actions

  const street = [address.street, address.without_number ? 's/n' : address.number]
    .filter(Boolean)
    .join(', ')

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <EstablishmentCover cover={detail.cover} detail />

      <View style={[styles.section, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <Text style={[styles.name, { color: colors.foreground }]}>{detail.name}</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {[detail.categories.find((item) => item.is_primary)?.name, address.district]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <OperatingStatus establishment={detail} />
        {detail.is_sponsored ? (
          <Text style={[styles.sponsored, { color: colors.mutedForeground }]}>Patrocinado</Text>
        ) : null}
      </View>

      {primaryAction ? (
        <View style={[styles.actions, { backgroundColor: colors.surfaceBase }]}>
          <Pressable
            accessibilityRole="button"
            onPress={primaryAction.onPress}
            style={[styles.action, { backgroundColor: colors.cta }]}>
            <Text style={[styles.actionLabel, { color: colors.ctaForeground }]}>
              {primaryAction.label}
            </Text>
          </Pressable>
          <View style={styles.secondaryActions}>
            {secondaryActions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                onPress={action.onPress}
                style={[
                  styles.secondaryAction,
                  { backgroundColor: colors.actionSecondary, borderColor: colors.actionSecondaryBorder },
                ]}>
                <Ionicons name={action.icon} size={18} color={colors.actionSecondaryForeground} accessible={false} />
                <Text style={[styles.actionLabel, { color: colors.actionSecondaryForeground }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {detail.description ? (
        <View style={[styles.section, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <Text style={[styles.body, { color: colors.foreground }]}>{detail.description}</Text>
        </View>
      ) : null}

      {street ? (
        <View style={[styles.section, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.foreground }]}>Endereço</Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            {[street, address.district, `${detail.city.name} · ${detail.city.state_code}`]
              .filter(Boolean)
              .join('\n')}
          </Text>
        </View>
      ) : null}

      <EstablishmentHours establishment={detail} />

      {detail.attributes.length > 0 ? (
        <View style={[styles.section, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
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
  section: { gap: spacing.xs, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderWidth: 1, borderRadius: radius.surface },
  name: { ...typography.title },
  meta: typography.caption,
  sponsored: { ...typography.caption, fontWeight: '600', textTransform: 'uppercase' },
  heading: { ...typography.heading, marginBottom: spacing.xs },
  body: typography.body,
  message: { ...typography.body, textAlign: 'center' },
  actions: { gap: spacing.sm, padding: spacing.lg },
  action: { borderRadius: radius.surface, padding: spacing.md, minHeight: 48 },
  secondaryActions: { flexDirection: 'row', gap: spacing.sm },
  secondaryAction: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  actionLabel: { ...typography.body, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
})
