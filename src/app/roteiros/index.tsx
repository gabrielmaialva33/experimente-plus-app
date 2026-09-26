import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import { Button } from '@/components/button'
import { ContentSkeleton } from '@/components/content-skeleton'
import { EmptyState } from '@/components/empty-state'
import { usePullToRefresh } from '@/components/pull-to-refresh'
import { TextField } from '@/components/text-field'
import { useCreateItinerary, useItineraries } from '@/explorer/queries'
import { radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * The person's itineraries — Anexo I item 10.
 *
 * Private to them by design (ADR-0030): nothing on this screen is visible to
 * anyone else, and the copy does not suggest otherwise. The existing ones come
 * first and "Novo roteiro" closes the list (audit A37): what a person has is
 * what they come back for.
 */
export default function ItinerariesScreen() {
  const colors = useColors()
  const router = useRouter()
  const query = useItineraries()
  const [composing, setComposing] = useState(false)
  const refreshControl = usePullToRefresh(query.refetch)

  if (query.isPending) return <ContentSkeleton label="Carregando seus roteiros" variant="catalog" />

  const items = query.data?.data ?? []

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={items}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <Text style={[styles.lead, { color: colors.mutedForeground }]}>
          Seus roteiros são só seus. Monte uma sequência de lugares para um dia ou um passeio.
        </Text>
      }
      ListEmptyComponent={
        query.isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Não foi possível carregar seus roteiros agora"
            action={{ label: 'Tentar de novo', onPress: () => void query.refetch() }}
          />
        ) : composing ? null : (
          // Audit A34: an empty list offers the way to fill it.
          <EmptyState
            icon="map-outline"
            title="Nenhum roteiro ainda"
            text="Crie um e adicione lugares a partir dos seus favoritos ou da página de cada lugar."
            action={{ label: 'Criar roteiro', onPress: () => setComposing(true) }}
          />
        )
      }
      ListFooterComponent={
        composing ? (
          <NewItinerary onCancel={() => setComposing(false)} />
        ) : items.length > 0 ? (
          <Button label="Novo roteiro" icon="add" variant="outline" size={52} fill onPress={() => setComposing(true)} testID="new-itinerary" />
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${item.name}, ${item.stops_count} ${item.stops_count === 1 ? 'parada' : 'paradas'}`}
          onPress={() => router.push(`/roteiros/${item.id}`)}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: pressed ? colors.muted : colors.card, borderColor: colors.borderSubtle },
          ]}
          testID={`itinerary-${item.id}`}>
          <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="map-outline" size={22} color={colors.primaryAccent} />
          </View>
          <View style={styles.copy}>
            <Text numberOfLines={1} style={[styles.name, { color: colors.foreground }]}>
              {item.name}
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {item.stops_count} {item.stops_count === 1 ? 'parada' : 'paradas'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </Pressable>
      )}
    />
  )
}

function NewItinerary({ onCancel }: { onCancel: () => void }) {
  const colors = useColors()
  const router = useRouter()
  const create = useCreateItinerary()
  const [name, setName] = useState('')

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    create.mutate(
      { name: trimmed },
      {
        onSuccess: (itinerary) => {
          setName('')
          onCancel()
          router.push(`/roteiros/${itinerary.id}`)
        },
      }
    )
  }

  return (
    <View style={[styles.create, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
      <TextField
        label="Nome do novo roteiro"
        value={name}
        onChangeText={setName}
        maxLength={120}
        placeholder="Ex.: Sábado no centro"
        returnKeyType="done"
        autoFocus
        onSubmitEditing={submit}
        error={create.isError ? 'Não foi possível criar o roteiro agora.' : null}
        testID="new-itinerary-name"
      />
      <View style={styles.actions}>
        <Button label="Cancelar" variant="ghost" onPress={onCancel} />
        <Button
          label={create.isPending ? 'Criando…' : 'Criar roteiro'}
          accessibilityLabel="Criar roteiro"
          disabled={!name.trim() || create.isPending}
          onPress={submit}
          testID="create-itinerary"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, padding: spacing.gutter, paddingBottom: spacing.xxl },
  lead: { ...typography.body, paddingBottom: spacing.xs },
  card: {
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  icon: { alignItems: 'center', borderRadius: radius.pill, height: 44, justifyContent: 'center', width: 44 },
  copy: { flex: 1, gap: 2 },
  name: { ...typography.body, ...textWeight('700') },
  meta: typography.meta,
  create: { borderRadius: radius.card, borderWidth: 1, gap: spacing.lg, padding: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
})
