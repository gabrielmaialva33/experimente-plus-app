import { useRouter } from 'expo-router'
import type { ReactElement } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import type { SavedKind } from '@/api/explorer'
import { ContentSkeleton } from '@/components/content-skeleton'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

import { EstablishmentCardRow } from './establishment-card-row'
import { useSavedList, useToggleSaved } from './queries'

const COPY: Record<SavedKind, { loading: string; empty: string; remove: string }> = {
  favorites: {
    loading: 'Carregando seus favoritos',
    empty: 'Você ainda não favoritou nenhum lugar. Toque em Favoritar na página de um estabelecimento.',
    remove: 'Remover dos favoritos',
  },
  follows: {
    loading: 'Carregando quem você segue',
    empty: 'Você ainda não segue nenhum lugar. Toque em Seguir na página de um estabelecimento.',
    remove: 'Deixar de seguir',
  },
}

/**
 * Favourites and follows share this screen because they render the same thing.
 * They stay two relations on the server, where the difference has consequences.
 *
 * `unavailable` is shown as a sentence, not hidden: a saved place that was
 * withdrawn is kept, and without this line the person would believe the app
 * lost it.
 */
export function SavedListScreen({ kind, header }: { kind: SavedKind; header?: ReactElement }) {
  const colors = useColors()
  const query = useSavedList(kind)
  const copy = COPY[kind]

  if (query.isPending) return <ContentSkeleton label={copy.loading} variant="catalog" />

  const items = query.data?.data ?? []
  const unavailable = query.data?.unavailable ?? 0

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <>
          {header ?? null}
          {unavailable > 0 ? (
          <Text style={[styles.notice, { color: colors.mutedForeground }]} testID="saved-unavailable">
            {unavailable === 1
              ? '1 lugar salvo está indisponível no momento e aparecerá de novo se voltar ao catálogo.'
              : `${unavailable} lugares salvos estão indisponíveis no momento e aparecerão de novo se voltarem ao catálogo.`}
          </Text>
          ) : null}
        </>
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          {query.isError ? 'Não foi possível carregar agora.' : copy.empty}
        </Text>
      }
      renderItem={({ item }) => (
        <SavedRow kind={kind} removeLabel={copy.remove} item={item} />
      )}
    />
  )
}

function SavedRow({
  kind,
  removeLabel,
  item,
}: {
  kind: SavedKind
  removeLabel: string
  item: NonNullable<ReturnType<typeof useSavedList>['data']>['data'][number]
}) {
  const colors = useColors()
  const router = useRouter()
  const toggle = useToggleSaved(kind, item.establishment.id)

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
      testID={`saved-${item.establishment.id}`}>
      <EstablishmentCardRow
        card={item.establishment}
        onPress={() =>
          router.push(`/estabelecimento/${item.establishment.city_slug}/${item.establishment.slug}`)
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${removeLabel}: ${item.establishment.name}`}
        disabled={toggle.isPending}
        onPress={() => toggle.mutate(false)}
        style={[styles.remove, { borderColor: colors.actionSecondaryBorder }]}
        testID={`unsave-${item.establishment.id}`}>
        <Text style={[styles.removeLabel, { color: colors.actionSecondaryForeground }]}>
          {removeLabel}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, padding: spacing.lg },
  card: { borderWidth: 1, borderRadius: radius.surface, gap: spacing.md, padding: spacing.lg },
  notice: { ...typography.caption, paddingBottom: spacing.sm },
  empty: { ...typography.body, padding: spacing.lg, textAlign: 'center' },
  remove: { alignItems: 'center', borderRadius: radius.md, borderWidth: 1, justifyContent: 'center', minHeight: 44 },
  removeLabel: { ...typography.body, fontWeight: '600' },
})
