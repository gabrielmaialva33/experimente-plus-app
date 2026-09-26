import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { resolveMediaUrl } from '@/api/config'
import type { PartnerContentItemKind, PartnerContentKind } from '@/api/partner-content'
import { Button } from '@/components/button'
import { COMPACT_CARD, CompactCard } from '@/components/compact-card'
import { DateTile } from '@/components/date-tile'
import { RemoteImage } from '@/components/remote-image'
import { SectionHeader } from '@/components/section-header'
import { highlightKey } from '@/place/links'
import { reportHref } from '@/reviews/report-link'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

import { ContentFavorite, ContentMenu, shareContent } from './content-actions'
import { publishedContentView, type PublishedContentView } from './presentation'
import { usePartnerContent } from './queries'

interface EstablishmentPartnerContentProps {
  establishmentId: number
  timeZone: string
  /** What sharing an item needs: the page it lives on, since it has none of its own. */
  establishmentName: string
  citySlug: string
  establishmentSlug: string
  /** `experience-31`: the item a link asked to bring into view (audit A14). */
  highlight?: string | null
  /** Where, inside its parent, the section with that item sits. */
  onHighlightLayout?: (y: number) => void
}

const KINDS: PartnerContentKind[] = ['experiences', 'events', 'showcase-items']

const LABELS: Record<PartnerContentItemKind, string> = {
  experience: 'Experiência',
  event: 'Evento',
  showcase_item: 'Vitrine',
}

/** The slot around a card: a constant frame, so the marked one is not larger. */
const FRAME = 3
const GAP = spacing.md - FRAME * 2

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

function formatEventTime(item: PublishedContentView, timeZone: string): string | null {
  if (!item.startsAt || !item.endsAt) return null
  const start = new Date(item.startsAt)
  const end = new Date(item.endsAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  try {
    const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone })
    return `${time.format(start)}–${time.format(end)}`
  } catch {
    return null
  }
}

const coverOf = (item: PublishedContentView) =>
  item.media.find((media) => media.isCover) ?? item.media[0] ?? null

/**
 * "Para viver aqui": the place's experiences, events and showcase in one row of
 * cards of equal size (audits A41, A42). An event shows its date as the picture.
 * Each card keeps its heart in sight and puts share and report behind "⋯"
 * (A32); tapping it opens the whole item in a sheet.
 *
 * A link that names an item (A14) marks its card, brings the row to it and
 * tells the page where the section is, so the page can scroll there.
 */
export function EstablishmentPartnerContent({
  establishmentId,
  timeZone,
  establishmentName,
  citySlug,
  establishmentSlug,
  highlight = null,
  onHighlightLayout,
}: EstablishmentPartnerContentProps) {
  const colors = useColors()
  const row = useRef<ScrollView>(null)
  const [open, setOpen] = useState<PublishedContentView | null>(null)
  const experiences = usePartnerContent(establishmentId, 'experiences')
  const events = usePartnerContent(establishmentId, 'events')
  const showcase = usePartnerContent(establishmentId, 'showcase-items')
  const queryByKind = {
    experiences,
    events,
    'showcase-items': showcase,
  }

  const items = KINDS.flatMap((kind) =>
    (queryByKind[kind].data ?? [])
      .map((item) => publishedContentView(item))
      .filter((item): item is PublishedContentView => item !== null)
  )
  const pending = experiences.isPending || events.isPending || showcase.isPending
  const marked = items.findIndex((item) => highlightKey(item.kind, item.id) === highlight)

  if (!pending && items.length === 0) return null

  const context = { establishmentName, citySlug, establishmentSlug }

  return (
    <View
      style={styles.section}
      testID="place-content"
      onLayout={(event) => {
        if (marked >= 0) onHighlightLayout?.(event.nativeEvent.layout.y)
      }}>
      <SectionHeader title="Para viver aqui" />
      {pending && items.length === 0 ? (
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Carregando experiências e novidades…
        </Text>
      ) : (
        <ScrollView
          ref={row}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.row}
          contentContainerStyle={styles.rowContent}
          onContentSizeChange={() => {
            if (marked > 0) {
              row.current?.scrollTo({ x: marked * (COMPACT_CARD.width + FRAME * 2 + GAP), animated: false })
            }
          }}>
          {items.map((item, index) => {
            const props = { kind: item.kind, id: item.id, title: item.title, ...context, tone: 'image' as const }
            const cover = coverOf(item)
            const date = item.kind === 'event' && item.startsAt ? item.startsAt : null
            const price = item.kind === 'showcase_item' ? formatPrice(item.informationalPriceCents) : null
            const time = item.kind === 'event' ? formatEventTime(item, timeZone) : null
            return (
              <View
                key={`${item.kind}-${item.id}`}
                testID={`content-${item.kind}-${item.id}`}
                style={[styles.slot, { borderColor: index === marked ? colors.primary : 'transparent' }]}>
                <CompactCard
                  overline={LABELS[item.kind]}
                  title={item.title}
                  meta={price ?? time}
                  image={date || !cover ? null : { uri: resolveMediaUrl(cover.url), alt: cover.altText }}
                  media={date ? <DateTile iso={date} timeZone={timeZone} /> : undefined}
                  onPress={() => setOpen(item)}
                />
                <View style={styles.overlay}>
                  <ContentFavorite {...props} />
                  <ContentMenu {...props} />
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}
      <ContentSheet item={open} timeZone={timeZone} context={context} onClose={() => setOpen(null)} />
    </View>
  )
}

/** One item in full: what the card had no room for. */
function ContentSheet({
  item,
  timeZone,
  context,
  onClose,
}: {
  item: PublishedContentView | null
  timeZone: string
  context: { establishmentName: string; citySlug: string; establishmentSlug: string }
  onClose: () => void
}) {
  const colors = useColors()
  const router = useRouter()
  if (!item) return null

  const cover = coverOf(item)
  // The payload's own kind decides the temporal and price affordances,
  // so a collection never has to be trusted to describe its items.
  const eventWindow = item.kind === 'event' ? formatEventWindow(item, timeZone) : null
  const price = item.kind === 'showcase_item' ? formatPrice(item.informationalPriceCents) : null
  const props = { kind: item.kind, id: item.id, title: item.title, ...context }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: colors.scrim }]}
        />
        <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={styles.sheetContent} testID={`content-sheet-${item.kind}-${item.id}`}>
            {cover ? (
              <RemoteImage
                source={{ uri: resolveMediaUrl(cover.url) }}
                accessibilityLabel={cover.altText}
                style={styles.media}
                contentFit="cover"
                transition={150}
              />
            ) : null}
            <View style={styles.copy}>
              <Text style={[styles.overline, { color: colors.primaryAccent }]}>{LABELS[item.kind]}</Text>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
                {item.title}
              </Text>
              {eventWindow ? (
                <Text style={[styles.meta, { color: colors.primaryAccent }]}>{eventWindow}</Text>
              ) : null}
              {price ? <Text style={[styles.price, { color: colors.ctaAccent }]}>{price}</Text> : null}
            </View>
            {item.description ? (
              <Text style={[styles.body, { color: colors.foreground }]}>{item.description}</Text>
            ) : null}
            {cover?.caption ? (
              <Text style={[styles.caption, { color: colors.mutedForeground }]}>{cover.caption}</Text>
            ) : null}
            <View style={styles.actions}>
              <ContentFavorite {...props} testID={`sheet-favorite-${item.kind}-${item.id}`} />
              {item.kind === 'showcase_item' ? null : (
                <Button label="Compartilhar" icon="share-outline" variant="outline" size={44} onPress={() => void shareContent(props)} />
              )}
              <Button
                label="Denunciar"
                variant="ghost"
                size={44}
                onPress={() => {
                  onClose()
                  router.push(reportHref(item.kind, item.id, item.title))
                }}
              />
            </View>
            <Button label="Fechar" variant="primary" size={48} fill onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  // The row runs to the screen's edge; the page's gutter is its first inset.
  row: { marginHorizontal: -spacing.gutter },
  rowContent: { gap: GAP, paddingHorizontal: spacing.gutter - FRAME },
  slot: { borderRadius: radius.card + FRAME, borderWidth: 2, padding: FRAME - 2 },
  overlay: { gap: spacing.sm, position: 'absolute', right: spacing.sm + FRAME, top: spacing.sm + FRAME },
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { opacity: 0.45 },
  sheet: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, maxHeight: '88%', overflow: 'hidden' },
  sheetContent: { gap: spacing.lg, padding: spacing.gutter, paddingBottom: spacing.xxl },
  media: { borderRadius: radius.thumb, height: 190, width: '100%' },
  copy: { gap: spacing.xs },
  overline: typography.overline,
  title: typography.title,
  meta: { ...typography.meta, ...textWeight('600') },
  price: { ...typography.heading },
  body: typography.body,
  caption: typography.caption,
  actions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
})
