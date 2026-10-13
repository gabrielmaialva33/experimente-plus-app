import Ionicons from '@expo/vector-icons/Ionicons'
import type { InfiniteData, UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { resolveMediaUrl } from '@/api/config'
import type { FollowingUpdates, ForYou } from '@/api/explorer'
import { useLoadingCopy } from '@/api/online'
import type { CityAgendaView } from '@/catalog/agenda'
import { AgendaEventCard } from '@/catalog/city-agenda'
import { announce } from '@/components/announce'
import { Button } from '@/components/button'
import { CompactCard } from '@/components/compact-card'
import { GRID_GAP, MEASURE, useCardGrid, useScreenFrame } from '@/components/content-frame'
import { decorative } from '@/components/decorative'
import { coverImage } from '@/components/establishment-cover'
import { RemoteImage } from '@/components/remote-image'
import { SectionHeader } from '@/components/section-header'
import {
  followingUpdateView,
  loadedUpdates,
  type FollowingUpdateView,
} from '@/explorer/following-updates'
import { placeHref } from '@/place/links'
import { useLineCap } from '@/theme/font-scale'
import { radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * The sections of the "Novidades" tab. Each one answers for itself: it says it
 * is loading (or waiting for the connection), offers another try when it
 * failed, and leads somewhere when it is empty, so one failing source never
 * takes the others down. The screen owns the queries, for its single pull.
 */

/** A section's state when it has nothing to list: a line and the one way forward. */
function SectionNotice({
  text,
  action,
  testID,
}: {
  text: string
  action?: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }
  testID?: string
}) {
  const colors = useColors()
  return (
    <View testID={testID} style={styles.notice}>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>{text}</Text>
      {action ? (
        <Button
          label={action.label}
          icon={action.icon}
          variant="outline"
          size={44}
          onPress={action.onPress}
        />
      ) : null}
    </View>
  )
}

/** Title and content of a section, both kept to the screen's column. */
function Section({
  title,
  hint,
  testID,
  children,
}: {
  title: string
  hint?: string | null
  testID: string
  children: ReactNode
}) {
  const frame = useScreenFrame()
  return (
    <View testID={testID} style={styles.section}>
      <View style={frame.padding}>
        <SectionHeader title={title} hint={hint} />
      </View>
      {children}
    </View>
  )
}

function Loading({ copy }: { copy: string }) {
  const colors = useColors()
  const frame = useScreenFrame()
  const text = useLoadingCopy(copy)
  return <Text style={[styles.body, frame.padding, { color: colors.mutedForeground }]}>{text}</Text>
}

/** For a visitor: what an account adds here, and the way to it. */
export function NewsSignInPrompt() {
  const colors = useColors()
  const router = useRouter()
  const frame = useScreenFrame()
  return (
    <View style={frame.padding}>
      <View testID="news-sign-in" style={[styles.prompt, { backgroundColor: colors.primarySoft }]}>
        <Text accessibilityRole="header" style={[styles.promptTitle, { color: colors.foreground }]}>
          Recomendações para você
        </Text>
        <Text style={[styles.body, { color: colors.foreground }]}>
          Entre na sua conta para ver lugares dos seus interesses e as novidades dos lugares que
          você segue.
        </Text>
        <Button
          label="Entrar"
          icon="log-in-outline"
          onPress={() => router.navigate('/(tabs)/sign-in')}
          testID="news-sign-in-action"
        />
      </View>
    </View>
  )
}

/**
 * "Para você": the same places as Explorar's row, from the same request. With
 * no interest chosen it invites to choose some instead of showing nothing.
 */
export function NewsForYouSection({
  query,
  cityName,
}: {
  query: UseQueryResult<ForYou>
  cityName: string | null
}) {
  const colors = useColors()
  const router = useRouter()
  const frame = useScreenFrame()
  const row = query.data

  if (query.isPending) {
    return (
      <Section title="Para você" testID="news-for-you">
        <Loading copy="Carregando sugestões para você…" />
      </Section>
    )
  }

  if (!row) {
    return (
      <Section title="Para você" testID="news-for-you">
        <View style={frame.padding}>
          <SectionNotice
            testID="news-for-you-failed"
            text="Não foi possível carregar as sugestões para você agora."
            action={{ label: 'Tentar de novo', onPress: () => void query.refetch() }}
          />
        </View>
      </Section>
    )
  }

  if (!row.has_interests) {
    return (
      <View testID="news-for-you" style={frame.padding}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Escolher interesses para ver lugares para você"
          onPress={() => router.push('/conta/interesses')}
          style={[styles.prompt, { backgroundColor: colors.primarySoft }]}
        >
          <Text style={[styles.body, { color: colors.foreground }]}>
            Escolha seus interesses e veja aqui lugares para você.
          </Text>
          <Text style={[styles.action, { color: colors.primaryAccent }]}>Escolher interesses</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <Section title="Para você" hint="Com base nos seus interesses" testID="news-for-you">
      {row.data.length === 0 ? (
        <View style={frame.padding}>
          <SectionNotice
            text={`Nada dos seus interesses publicado em ${cityName ?? 'sua cidade'} por enquanto.`}
            action={{ label: 'Editar interesses', onPress: () => router.push('/conta/interesses') }}
          />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.row, frame.padding]}
        >
          {row.data.map((establishment) => (
            <CompactCard
              key={establishment.slug}
              testID={`news-for-you-${establishment.slug}`}
              title={establishment.name}
              meta={[establishment.primary_category?.name, establishment.address.district]
                .filter(Boolean)
                .join(' · ')}
              image={coverImage(establishment.cover)}
              onPress={() => router.push(placeHref(establishment.city.slug, establishment.slug))}
            />
          ))}
        </ScrollView>
      )}
    </Section>
  )
}

const KIND_ICON: Record<FollowingUpdateView['kind'], keyof typeof Ionicons.glyphMap> = {
  experience: 'sparkles-outline',
  event: 'calendar-outline',
  showcase_item: 'pricetag-outline',
}

function UpdateCard({ update, width }: { update: FollowingUpdateView; width: number | '100%' }) {
  const colors = useColors()
  const router = useRouter()
  const oneLine = useLineCap(1)
  const twoLines = useLineCap(2)
  const meta = [update.when, update.price].filter(Boolean).join(' · ')
  const icon = (
    <View style={[styles.thumb, styles.fallback, { backgroundColor: colors.primarySoft }]}>
      <Ionicons name={KIND_ICON[update.kind]} size={26} color={colors.primaryAccent} />
    </View>
  )

  return (
    <Pressable
      testID={`news-update-${update.key}`}
      accessibilityRole="button"
      accessibilityLabel={[
        `${update.kindLabel}: ${update.title}`,
        update.establishmentName,
        update.when,
        update.price ? `preço informativo ${update.price}` : null,
      ]
        .filter(Boolean)
        .join(', ')}
      onPress={() => router.push(update.href)}
      style={({ pressed }) => [
        styles.update,
        {
          width,
          backgroundColor: colors.card,
          borderColor: colors.borderSubtle,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {update.cover ? (
        <RemoteImage
          source={{ uri: resolveMediaUrl(update.cover.url) }}
          accessibilityLabel={update.cover.alt}
          style={styles.thumb}
          contentFit="cover"
          fallback={icon}
        />
      ) : (
        <View {...decorative}>{icon}</View>
      )}
      <View style={styles.updateCopy}>
        <Text numberOfLines={oneLine} style={[styles.overline, { color: colors.primaryAccent }]}>
          {`${update.kindLabel} · ${update.establishmentName}`}
        </Text>
        <Text numberOfLines={twoLines} style={[styles.title, { color: colors.foreground }]}>
          {update.title}
        </Text>
        {meta ? (
          <Text numberOfLines={oneLine} style={[styles.meta, { color: colors.mutedForeground }]}>
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

/**
 * "Dos lugares que você segue": what the followed places published, newest
 * first, a page at a time. Following nothing and nothing new are told apart,
 * because each leads somewhere else.
 */
export function NewsFollowingSection({
  query,
}: {
  query: UseInfiniteQueryResult<InfiniteData<FollowingUpdates>>
}) {
  const router = useRouter()
  const frame = useScreenFrame()
  const grid = useCardGrid()
  const width = grid.columns > 1 ? grid.columnWidth : '100%'
  const pages = query.data?.pages
  const title = 'Dos lugares que você segue'

  if (query.isPending) {
    return (
      <Section title={title} testID="news-following">
        <Loading copy="Carregando as novidades dos lugares que você segue…" />
      </Section>
    )
  }

  if (!pages) {
    return (
      <Section title={title} testID="news-following">
        <View style={frame.padding}>
          <SectionNotice
            testID="news-following-failed"
            text="Não foi possível carregar as novidades dos lugares que você segue agora."
            action={{ label: 'Tentar de novo', onPress: () => void query.refetch() }}
          />
        </View>
      </Section>
    )
  }

  const updates = loadedUpdates(pages).map(followingUpdateView)
  const following = pages[0]?.has_follows === true

  const more = async () => {
    const result = await query.fetchNextPage()
    if (!result.isError) announce('Mais novidades carregadas.')
  }

  return (
    <Section title={title} testID="news-following">
      <View style={[styles.list, frame.padding]}>
        {!following ? (
          <SectionNotice
            text="Siga lugares para ver aqui o que eles publicam: toque no sino na página de um lugar."
            action={{
              label: 'Explorar lugares',
              icon: 'compass-outline',
              onPress: () => router.navigate('/'),
            }}
          />
        ) : updates.length === 0 ? (
          <SectionNotice
            text="Os lugares que você segue ainda não publicaram novidades."
            action={{ label: 'Ver quem você segue', onPress: () => router.push('/conta/seguindo') }}
          />
        ) : (
          <View accessibilityRole="list" style={styles.grid}>
            {updates.map((update) => (
              <UpdateCard key={update.key} update={update} width={width} />
            ))}
          </View>
        )}

        {query.isFetchNextPageError ? (
          <SectionNotice text="Não foi possível carregar mais novidades agora." />
        ) : null}
        {query.hasNextPage ? (
          <Button
            label={query.isFetchingNextPage ? 'Carregando…' : 'Ver mais novidades'}
            accessibilityLabel="Ver mais novidades"
            variant="outline"
            size={44}
            disabled={query.isFetchingNextPage}
            onPress={() => void more()}
            testID="news-following-more"
          />
        ) : null}
      </View>
    </Section>
  )
}

/**
 * "Agenda da cidade": the events of today and the coming days in the city
 * chosen in Explorar, from the same agenda, already resolved in the city's
 * timezone by the server.
 */
export function NewsAgendaSection({
  citySlug,
  cityName,
  query,
}: {
  citySlug: string | null
  cityName: string | null
  query: UseQueryResult<CityAgendaView>
}) {
  const router = useRouter()
  const colors = useColors()
  const frame = useScreenFrame()
  const grid = useCardGrid()
  const width = grid.columns > 1 ? grid.columnWidth : '100%'
  const title = 'Agenda da cidade'
  const chooseCity = (label: string) => ({
    label,
    icon: 'location-outline' as const,
    onPress: () => router.push('/conta/cidade'),
  })

  if (!citySlug) {
    return (
      <Section title={title} testID="news-agenda">
        <View style={frame.padding}>
          <SectionNotice
            text="Escolha uma cidade para ver os eventos dela."
            action={chooseCity('Escolher cidade')}
          />
        </View>
      </Section>
    )
  }

  if (query.isPending) {
    return (
      <Section title={title} testID="news-agenda">
        <Loading copy="Carregando a agenda da cidade…" />
      </Section>
    )
  }

  const agenda = query.data
  if (!agenda) {
    return (
      <Section title={title} testID="news-agenda">
        <View style={frame.padding}>
          <SectionNotice
            testID="news-agenda-failed"
            text="Não foi possível carregar a agenda agora."
            action={{ label: 'Tentar de novo', onPress: () => void query.refetch() }}
          />
        </View>
      </Section>
    )
  }

  const name = agenda.city.name ?? cityName ?? 'sua cidade'
  const bands = [
    { key: 'today', label: 'Hoje', today: true, items: agenda.happeningToday },
    { key: 'upcoming', label: 'Em breve', today: false, items: agenda.upcoming },
  ].filter((band) => band.items.length > 0)

  return (
    <Section title={title} hint={name} testID="news-agenda">
      <View style={[styles.list, frame.padding]}>
        {bands.length === 0 ? (
          <SectionNotice
            text={`Nenhum evento anunciado em ${name} por enquanto.`}
            action={chooseCity('Escolher outra cidade')}
          />
        ) : (
          bands.map((band) => (
            <View key={band.key} testID={`news-agenda-${band.key}`} style={styles.band}>
              <Text
                accessibilityRole="header"
                style={[styles.bandTitle, { color: colors.mutedForeground }]}
              >
                {band.label}
              </Text>
              <View style={styles.grid}>
                {band.items.map((item) => (
                  <AgendaEventCard
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    timeZone={agenda.city.timeZone}
                    today={band.today}
                    width={width}
                    onPress={() =>
                      router.push(
                        placeHref(item.citySlug, item.establishmentSlug, {
                          kind: item.kind,
                          id: item.id,
                        })
                      )
                    }
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </Section>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  body: typography.body,
  notice: { gap: spacing.sm, maxWidth: MEASURE.readable },
  prompt: {
    borderRadius: radius.card,
    gap: spacing.sm,
    maxWidth: MEASURE.readable,
    padding: spacing.lg,
  },
  promptTitle: { ...typography.heading, fontSize: 18, lineHeight: 23 },
  action: { ...typography.label, ...textWeight('700') },
  row: { gap: spacing.md },
  list: { gap: spacing.md },
  grid: { columnGap: GRID_GAP, flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
  band: { gap: spacing.sm },
  bandTitle: typography.overline,
  update: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 96,
    padding: spacing.md,
  },
  thumb: { borderRadius: radius.thumb, height: 72, width: 72 },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  updateCopy: { flex: 1, gap: 2, minWidth: 0 },
  overline: typography.overline,
  title: { ...typography.label, ...textWeight('700'), fontSize: 16, lineHeight: 21 },
  meta: typography.meta,
})
