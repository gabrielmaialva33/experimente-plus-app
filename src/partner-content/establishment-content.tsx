import { Image } from 'expo-image'

import { StyleSheet, Text, View } from 'react-native'

import { resolveMediaUrl } from '@/api/config'
import type { PartnerContentKind } from '@/api/partner-content'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

import { publishedContentView, type PublishedContentView } from './presentation'
import { usePartnerContent } from './queries'

interface EstablishmentPartnerContentProps {
  establishmentId: number
  timeZone: string
}

const groups: { kind: PartnerContentKind; title: string; eyebrow: string }[] = [
  { kind: 'experiences', title: 'Experiências', eyebrow: 'Para viver aqui' },
  { kind: 'events', title: 'Eventos', eyebrow: 'Na agenda' },
  { kind: 'showcase-items', title: 'Vitrine', eyebrow: 'Em destaque' },
]

function formatEventWindow(item: PublishedContentView, timeZone: string): string | null {
  if (!item.startsAt || !item.endsAt) return null

  const start = new Date(item.startsAt)
  const end = new Date(item.endsAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null

  try {
    const day = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeZone,
    }).format(start)
    const time = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    })
    return `${day} · ${time.format(start)}–${time.format(end)}`
  } catch {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(start)
  }
}

function formatPrice(cents: number | null): string | null {
  if (cents === null) return null
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

export function EstablishmentPartnerContent({
  establishmentId,
  timeZone,
}: EstablishmentPartnerContentProps) {
  const colors = useColors()
  const experiences = usePartnerContent(establishmentId, 'experiences')
  const events = usePartnerContent(establishmentId, 'events')
  const showcase = usePartnerContent(establishmentId, 'showcase-items')
  const queryByKind = {
    experiences,
    events,
    'showcase-items': showcase,
  }

  const sections = groups.map((group) => ({
    ...group,
    items: (queryByKind[group.kind].data ?? [])
      .map((item) => publishedContentView(item))
      .filter((item): item is PublishedContentView => item !== null),
  }))

  const pending = experiences.isPending || events.isPending || showcase.isPending
  const visible = sections.filter((section) => section.items.length > 0)

  if (!pending && visible.length === 0) return null

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.heading, { color: colors.foreground }]}>Descubra mais neste lugar</Text>

      {pending && visible.length === 0 ? (
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Carregando experiências e novidades…
        </Text>
      ) : (
        visible.map((section) => (
          <View key={section.kind} style={styles.group}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>{section.eyebrow}</Text>
            <Text style={[styles.groupTitle, { color: colors.foreground }]}>{section.title}</Text>
            {section.items.map((item) => {
              // The payload's own kind decides the temporal and price affordances,
              // so a collection never has to be trusted to describe its items.
              const eventWindow = item.kind === 'event' ? formatEventWindow(item, timeZone) : null
              const price =
                item.kind === 'showcase_item' ? formatPrice(item.informationalPriceCents) : null
              const cover =
                item.media.find((media) => media.isCover) ?? item.media[0] ?? null

              return (
                <View
                  key={item.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  {cover ? (
                    <Image
                      source={{ uri: resolveMediaUrl(cover.url) }}
                      accessibilityLabel={cover.altText}
                      style={styles.media}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : null}
                  <View style={styles.cardHeader}>
                    <Text style={[styles.itemTitle, { color: colors.foreground }]}>
                      {item.title}
                    </Text>
                    {price ? (
                      <Text style={[styles.price, { color: colors.ctaAccent }]}>{price}</Text>
                    ) : null}
                  </View>
                  {eventWindow ? (
                    <Text style={[styles.meta, { color: colors.primaryAccent }]}>
                      {eventWindow}
                    </Text>
                  ) : null}
                  {item.description ? (
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>
                      {item.description}
                    </Text>
                  ) : null}
                  {cover?.caption ? (
                    <Text style={[styles.caption, { color: colors.mutedForeground }]}>
                      {cover.caption}
                    </Text>
                  ) : null}
                </View>
              )
            })}
          </View>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    borderRadius: radius.surface,
    borderWidth: 1,
    gap: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  heading: typography.heading,
  group: { gap: spacing.sm },
  eyebrow: { ...typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  groupTitle: { ...typography.body, fontWeight: '700' },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    overflow: 'hidden',
    paddingBottom: spacing.md,
  },
  media: { height: 150, width: '100%' },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  itemTitle: { ...typography.body, flex: 1, fontWeight: '700', paddingLeft: spacing.md, paddingTop: spacing.md },
  price: { ...typography.body, fontWeight: '700', paddingRight: spacing.md, paddingTop: spacing.md },
  meta: { ...typography.caption, fontWeight: '600', paddingHorizontal: spacing.md },
  body: { ...typography.body, paddingHorizontal: spacing.md },
  caption: { ...typography.caption, paddingHorizontal: spacing.md },
})
