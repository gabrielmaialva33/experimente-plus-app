import type Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { useCallback, useState, type ReactElement } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'

import type { EstablishmentCard, SavedKind } from '@/api/explorer'
import { ContentSkeleton } from '@/components/content-skeleton'
import { EmptyState } from '@/components/empty-state'
import { IconButton } from '@/components/icon-button'
import { usePullToRefresh } from '@/components/pull-to-refresh'
import { SectionHeader } from '@/components/section-header'
import { UndoBar } from '@/components/undo-bar'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

import { EstablishmentCardRow } from './establishment-card-row'
import { useSavedList, useToggleSaved } from './queries'

const COPY: Record<
  SavedKind,
  {
    loading: string
    emptyTitle: string
    empty: string
    icon: keyof typeof Ionicons.glyphMap
    remove: string
    removed: string
  }
> = {
  favorites: {
    loading: 'Carregando seus favoritos',
    emptyTitle: 'Você ainda não tem lugares favoritos',
    empty: 'Toque no coração na página de um lugar para guardá-lo aqui.',
    icon: 'heart',
    remove: 'Remover dos favoritos',
    removed: 'removido dos favoritos.',
  },
  follows: {
    loading: 'Carregando quem você segue',
    emptyTitle: 'Você ainda não segue nenhum lugar',
    empty: 'Siga um lugar para acompanhar as novidades dele.',
    icon: 'notifications',
    remove: 'Deixar de seguir',
    removed: 'deixou de ser seguido.',
  },
}

/**
 * Favourites and follows share this screen because they render the same thing.
 * They stay two relations on the server, where the difference has consequences.
 *
 * Places come first (audit A56), each on a row of the same height with the
 * filled heart (or bell) that removes it, and the removal can be undone from
 * the bar that confirms it (audit A57). `footer` carries what else a list holds,
 * such as favourited experiences.
 *
 * `unavailable` is shown as a sentence, not hidden: a saved place that was
 * withdrawn is kept, and without this line the person would believe the app
 * lost it.
 */
export function SavedListScreen({ kind, footer }: { kind: SavedKind; footer?: ReactElement }) {
  const colors = useColors()
  const router = useRouter()
  const query = useSavedList(kind)
  const copy = COPY[kind]
  const refreshControl = usePullToRefresh(query.refetch)
  const [removed, setRemoved] = useState<EstablishmentCard | null>(null)
  const dismiss = useCallback(() => setRemoved(null), [])

  if (query.isPending) return <ContentSkeleton label={copy.loading} variant="catalog" />

  const items = query.data?.data ?? []
  const unavailable = query.data?.unavailable ?? 0

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <FlatList
        style={styles.fill}
        contentContainerStyle={styles.list}
        data={items}
        refreshControl={refreshControl}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <View style={styles.header}>
            <SectionHeader title="Lugares" />
            {unavailable > 0 ? (
              <Text style={[styles.notice, { color: colors.mutedForeground }]} testID="saved-unavailable">
                {unavailable === 1
                  ? '1 lugar salvo está indisponível no momento e aparecerá de novo se voltar ao catálogo.'
                  : `${unavailable} lugares salvos estão indisponíveis no momento e aparecerão de novo se voltarem ao catálogo.`}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isError ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Não foi possível carregar agora"
              action={{ label: 'Tentar de novo', onPress: () => void query.refetch() }}
            />
          ) : (
            // Audit A34: an empty list says what goes here and where to find it.
            <EmptyState
              icon={`${copy.icon}-outline` as keyof typeof Ionicons.glyphMap}
              title={copy.emptyTitle}
              text={copy.empty}
              action={{ label: 'Explorar lugares', onPress: () => router.navigate('/') }}
            />
          )
        }
        ListFooterComponent={footer ?? null}
        renderItem={({ item }) => (
          <SavedRow
            kind={kind}
            icon={copy.icon}
            removeLabel={copy.remove}
            card={item.establishment}
            onRemoved={setRemoved}
          />
        )}
      />
      {removed ? (
        <View style={styles.undo}>
          <UndoAction
            key={removed.id}
            kind={kind}
            card={removed}
            message={`${removed.name} ${copy.removed}`}
            onDone={dismiss}
          />
        </View>
      ) : null}
    </View>
  )
}

function SavedRow({
  kind,
  icon,
  removeLabel,
  card,
  onRemoved,
}: {
  kind: SavedKind
  icon: keyof typeof Ionicons.glyphMap
  removeLabel: string
  card: EstablishmentCard
  onRemoved: (card: EstablishmentCard) => void
}) {
  const colors = useColors()
  const router = useRouter()
  const toggle = useToggleSaved(kind, card.id)

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
      testID={`saved-${card.id}`}>
      <EstablishmentCardRow
        card={card}
        onPress={() => router.push(`/estabelecimento/${card.city_slug}/${card.slug}`)}
        trailing={
          <IconButton
            icon={icon}
            selected
            accessibilityLabel={`${removeLabel}: ${card.name}`}
            onPress={() => {
              if (toggle.isPending) return
              toggle.mutate(false)
              onRemoved(card)
            }}
            testID={`unsave-${card.id}`}
          />
        }
      />
    </View>
  )
}

/** Saving again is the same toggle the row used, held here because the row is gone. */
function UndoAction({
  kind,
  card,
  message,
  onDone,
}: {
  kind: SavedKind
  card: EstablishmentCard
  message: string
  onDone: () => void
}) {
  const toggle = useToggleSaved(kind, card.id)
  return (
    <UndoBar
      message={message}
      onDismiss={onDone}
      onUndo={() => {
        toggle.mutate(true)
        onDone()
      }}
    />
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { gap: spacing.md, padding: spacing.gutter, paddingBottom: 96 },
  header: { gap: spacing.sm },
  card: { borderRadius: radius.card, borderWidth: 1, padding: spacing.md },
  notice: typography.meta,
  undo: { bottom: spacing.lg, left: spacing.gutter, position: 'absolute', right: spacing.gutter },
})
