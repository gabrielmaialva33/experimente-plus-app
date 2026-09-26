import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

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
 * Favourited experiences and events, above the favourited places.
 *
 * An item opens its establishment's page, where it is shown: there is no page
 * of its own to open. Unavailable ones — archived, ended, of a withdrawn
 * place — are counted in a sentence rather than left to look lost.
 */
export function ContentFavoritesSection() {
  const colors = useColors()
  const router = useRouter()
  const query = useSavedContent()
  const toggle = useToggleSavedContent()

  const items = query.data?.data ?? []
  const unavailable = query.data?.unavailable ?? 0
  if (query.isPending || (items.length === 0 && unavailable === 0)) return null

  return (
    <View style={styles.section} testID="content-favorites">
      <Text style={[styles.heading, { color: colors.foreground }]}>Experiências e eventos</Text>
      {unavailable > 0 ? (
        <Text style={[styles.notice, { color: colors.mutedForeground }]} testID="content-unavailable">
          {unavailable === 1
            ? '1 item salvo não está disponível agora — pode ter terminado ou saído do catálogo.'
            : `${unavailable} itens salvos não estão disponíveis agora — podem ter terminado ou saído do catálogo.`}
        </Text>
      ) : null}
      {items.map((entry) => {
        const when = entry.content.kind === 'event' ? formatWindow(entry.content.starts_at) : null
        return (
          <View
            key={entry.id}
            style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
            testID={`saved-content-${entry.content.kind}-${entry.content.id}`}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${entry.content.title}, ${entry.content.establishment.name}`}
              onPress={() =>
                router.push(
                  `/estabelecimento/${entry.content.establishment.city_slug}/${entry.content.establishment.slug}`
                )
              }>
              <Text style={[styles.kind, { color: colors.primary }]}>
                {KIND_LABEL[entry.content.kind]}
                {when ? ` · ${when}` : ''}
              </Text>
              <Text style={[styles.title, { color: colors.foreground }]}>{entry.content.title}</Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {entry.content.establishment.name} · {entry.content.establishment.city_name}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remover ${entry.content.title} dos favoritos`}
              disabled={toggle.isPending}
              onPress={() =>
                toggle.mutate({
                  kind: entry.content.kind === 'experience' ? 'experiences' : 'events',
                  id: entry.content.id,
                  save: false,
                })
              }
              style={[styles.remove, { borderColor: colors.actionSecondaryBorder }]}
              testID={`unsave-content-${entry.content.kind}-${entry.content.id}`}>
              <Text style={[styles.removeLabel, { color: colors.actionSecondaryForeground }]}>
                Remover dos favoritos
              </Text>
            </Pressable>
          </View>
        )
      })}
      <Text style={[styles.heading, { color: colors.foreground }]}>Lugares</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, paddingBottom: spacing.sm },
  heading: { ...typography.body, ...textWeight('700') },
  notice: typography.caption,
  card: { borderRadius: radius.surface, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  kind: { ...typography.caption, ...textWeight('600') },
  title: { ...typography.body, ...textWeight('600') },
  meta: typography.caption,
  remove: { alignItems: 'center', borderRadius: radius.md, borderWidth: 1, justifyContent: 'center', minHeight: 44 },
  removeLabel: { ...typography.body, ...textWeight('600') },
})
