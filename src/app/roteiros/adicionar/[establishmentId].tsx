import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { ApiError } from '@/api/client'
import { ContentSkeleton } from '@/components/content-skeleton'
import { useAddItineraryStop, useCreateItinerary, useItineraries } from '@/explorer/queries'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * Adds an establishment to one of the person's itineraries, or to a new one.
 *
 * The establishment is added at the end. Order is decided afterwards on the
 * itinerary itself, where the whole route is visible — choosing a position
 * here, blind to the other stops, would be guessing.
 */
export default function AddToItineraryScreen() {
  const colors = useColors()
  const router = useRouter()
  const { establishmentId } = useLocalSearchParams<{ establishmentId: string }>()
  const target = Number(establishmentId)
  const itineraries = useItineraries()
  const add = useAddItineraryStop()
  const create = useCreateItinerary()
  const [name, setName] = useState('')

  if (itineraries.isPending) {
    return <ContentSkeleton label="Carregando seus roteiros" variant="catalog" />
  }

  const addTo = (id: number) =>
    add.mutate(
      { id, establishmentId: target },
      { onSuccess: () => router.replace(`/roteiros/${id}`) }
    )

  const createAndAdd = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    create.mutate({ name: trimmed }, { onSuccess: (itinerary) => addTo(itinerary.id) })
  }

  const failure =
    add.error instanceof ApiError && add.error.status === 404
      ? 'Este lugar não está disponível para roteiros no momento.'
      : add.isError || create.isError
        ? 'Não foi possível adicionar agora.'
        : null

  const busy = add.isPending || create.isPending

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={itineraries.data?.data ?? []}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <View style={styles.header}>
          {failure ? (
            <Text style={[styles.body, { color: colors.destructiveAccent }]} testID="add-failure">
              {failure}
            </Text>
          ) : null}
          <View style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
            <Text style={[styles.body, { color: colors.foreground }]}>Novo roteiro</Text>
            <TextInput
              accessibilityLabel="Nome do novo roteiro"
              value={name}
              onChangeText={setName}
              maxLength={120}
              placeholder="Ex.: Sábado no centro"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
            <Pressable
              accessibilityRole="button"
              disabled={!name.trim() || busy}
              onPress={createAndAdd}
              style={[styles.primary, { backgroundColor: colors.primary, opacity: !name.trim() || busy ? 0.5 : 1 }]}
              testID="create-and-add">
              <Text style={[styles.label, { color: colors.primaryForeground }]}>Criar e adicionar</Text>
            </Pressable>
          </View>
          {(itineraries.data?.data.length ?? 0) > 0 ? (
            <Text style={[styles.caption, { color: colors.mutedForeground }]}>Ou adicione a um existente</Text>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Adicionar a ${item.name}`}
          disabled={busy}
          onPress={() => addTo(item.id)}
          style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
          testID={`add-to-${item.id}`}>
          <Text style={[styles.label, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.caption, { color: colors.mutedForeground }]}>
            {item.stops_count} {item.stops_count === 1 ? 'parada' : 'paradas'}
          </Text>
        </Pressable>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, padding: spacing.lg },
  header: { gap: spacing.md },
  card: { borderRadius: radius.surface, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
  input: { ...typography.body, borderRadius: radius.md, borderWidth: 1, minHeight: 48, paddingHorizontal: spacing.md },
  primary: { alignItems: 'center', borderRadius: radius.md, justifyContent: 'center', minHeight: 48 },
  body: typography.body,
  label: { ...typography.body, fontWeight: '600' },
  caption: typography.caption,
})
