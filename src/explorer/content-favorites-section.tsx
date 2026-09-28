import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { FavoriteContentPath } from '@/api/explorer'
import { Button } from '@/components/button'
import { IconButton } from '@/components/icon-button'
import { SectionHeader } from '@/components/section-header'
import { UndoBar } from '@/components/undo-bar'
import { placeHref } from '@/place/links'
import { useLineCap } from '@/theme/font-scale'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

import { useSavedContent, useToggleSavedContent } from './queries'

const KIND_LABEL = { experience: 'Experiência', event: 'Evento' } as const

function formatWindow(startsAt: string | null): string | null {
  if (!startsAt) return null
  const date = new Date(startsAt)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

/**
 * Favourited experiences and events, below the favourited places (audit A56:
 * the places are what a person comes back for).
 *
 * An item opens its establishment's page on it (audit A14): there is no page
 * of its own to open. Unavailable ones — archived, ended, of a withdrawn
 * place — are counted in a sentence rather than left to look lost. A removal
 * can be undone from the bar that confirms it (audit A57).
 */
export function ContentFavoritesSection() {
  const colors = useColors()
  const router = useRouter()
  const query = useSavedContent()
  const toggle = useToggleSavedContent()
  const [removed, setRemoved] = useState<{
    kind: FavoriteContentPath
    id: number
    title: string
  } | null>(null)
  const dismiss = useCallback(() => setRemoved(null), [])
  const lines = useLineCap(1)

  const items = query.data?.data ?? []
  const unavailable = query.data?.unavailable ?? 0
  // Left out, a list that failed would read as no favourites at all.
  const failed = query.isError && !query.data
  if (query.isPending || (items.length === 0 && unavailable === 0 && !removed && !failed))
    return null

  return (
    <View style={styles.section} testID="content-favorites">
      <SectionHeader title="Experiências e eventos" />
      {removed ? (
        <UndoBar
          message={`${removed.title} removido dos favoritos.`}
          onDismiss={dismiss}
          onUndo={() => {
            toggle.mutate({ kind: removed.kind, id: removed.id, save: true })
            dismiss()
          }}
        />
      ) : null}
      {failed ? (
        <View style={styles.failure} testID="content-favorites-failed">
          <Text style={[styles.notice, { color: colors.mutedForeground }]}>
            Não foi possível carregar suas experiências e eventos agora.
          </Text>
          <Button label="Tentar de novo" variant="outline" onPress={() => void query.refetch()} />
        </View>
      ) : null}
      {unavailable > 0 ? (
        <Text
          style={[styles.notice, { color: colors.mutedForeground }]}
          testID="content-unavailable"
        >
          {unavailable === 1
            ? '1 item salvo não está disponível agora — pode ter terminado ou saído do catálogo.'
            : `${unavailable} itens salvos não estão disponíveis agora — podem ter terminado ou saído do catálogo.`}
        </Text>
      ) : null}
      {items.map((entry) => {
        const when = entry.content.kind === 'event' ? formatWindow(entry.content.starts_at) : null
        const path: FavoriteContentPath =
          entry.content.kind === 'experience' ? 'experiences' : 'events'
        return (
          <View
            key={entry.id}
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.borderSubtle },
            ]}
            testID={`saved-content-${entry.content.kind}-${entry.content.id}`}
          >
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${entry.content.title}, ${entry.content.establishment.name}`}
              style={styles.copy}
              onPress={() =>
                router.push(
                  placeHref(
                    entry.content.establishment.city_slug,
                    entry.content.establishment.slug,
                    { kind: entry.content.kind, id: entry.content.id }
                  )
                )
              }
            >
              <Text numberOfLines={lines} style={[styles.kind, { color: colors.primaryAccent }]}>
                {KIND_LABEL[entry.content.kind]}
                {when ? ` · ${when}` : ''}
              </Text>
              <Text numberOfLines={lines} style={[styles.title, { color: colors.foreground }]}>
                {entry.content.title}
              </Text>
              <Text numberOfLines={lines} style={[styles.meta, { color: colors.mutedForeground }]}>
                {entry.content.establishment.name} · {entry.content.establishment.city_name}
              </Text>
            </Pressable>
            <IconButton
              icon="heart"
              selected
              accessibilityLabel={`Remover ${entry.content.title} dos favoritos`}
              onPress={() => {
                if (toggle.isPending) return
                const id = entry.content.id
                toggle.mutate(
                  { kind: path, id, save: false },
                  // Refused, the item stays listed: no "Desfazer" for it.
                  {
                    onError: () =>
                      setRemoved((current) =>
                        current?.kind === path && current.id === id ? null : current
                      ),
                  }
                )
                setRemoved({ kind: path, id, title: entry.content.title })
              }}
              testID={`unsave-content-${entry.content.kind}-${entry.content.id}`}
            />
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, paddingTop: spacing.section },
  notice: typography.meta,
  failure: { alignItems: 'flex-start', gap: spacing.sm },
  card: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 90,
    padding: spacing.md,
    paddingLeft: spacing.lg,
  },
  copy: { flex: 1, gap: 2 },
  kind: typography.overline,
  title: { ...typography.body, ...textWeight('700') },
  meta: typography.meta,
})
