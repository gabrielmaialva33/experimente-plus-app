import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import { ApiError } from '@/api/client'
import { Button } from '@/components/button'
import { ContentSkeleton } from '@/components/content-skeleton'
import { SectionHeader } from '@/components/section-header'
import { TextField } from '@/components/text-field'
import { useAddItineraryStop, useCreateItinerary, useItineraries } from '@/explorer/queries'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
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
  const [composing, setComposing] = useState(false)
  const [added, setAdded] = useState<{ id: number; name: string } | null>(null)

  if (itineraries.isPending) {
    return <ContentSkeleton label="Carregando seus roteiros" variant="catalog" />
  }

  // The person came from a place and stays with it (audit A25): the confirmation
  // offers the way back to the place first, and the itinerary second.
  const addTo = (itinerary: { id: number; name: string }) =>
    add.mutate(
      { id: itinerary.id, establishmentId: target },
      { onSuccess: () => setAdded({ id: itinerary.id, name: itinerary.name }) }
    )

  const createAndAdd = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    create.mutate({ name: trimmed }, { onSuccess: (itinerary) => addTo(itinerary) })
  }

  const failure =
    add.error instanceof ApiError && add.error.status === 404
      ? 'Este lugar não está disponível para roteiros no momento.'
      : add.isError || create.isError
        ? 'Não foi possível adicionar agora.'
        : null

  const busy = add.isPending || create.isPending
  const items = itineraries.data?.data ?? []

  if (added) {
    return (
      <View style={[styles.done, { backgroundColor: colors.background }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]} testID="added">
          <View style={[styles.badge, { backgroundColor: colors.successSoft }]}>
            <Ionicons name="checkmark" size={26} color={colors.successAccent} />
          </View>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
            Adicionado a {added.name}
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            O lugar entrou no fim do roteiro. A ordem se ajusta no próprio roteiro.
          </Text>
          <Button label="Voltar ao lugar" size={52} fill onPress={() => router.back()} />
          <Button label="Ver roteiro" variant="ghost" fill onPress={() => router.replace(`/roteiros/${added.id}`)} />
        </View>
      </View>
    )
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={items}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <View style={styles.header}>
          {failure ? (
            <Text accessibilityRole="alert" style={[styles.body, { color: colors.destructiveAccent }]} testID="add-failure">
              {failure}
            </Text>
          ) : null}
          {items.length > 0 ? <SectionHeader title="Seus roteiros" hint="Toque em um para adicionar o lugar." /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Adicionar a ${item.name}`}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => addTo(item)}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: pressed ? colors.muted : colors.card, borderColor: colors.borderSubtle },
          ]}
          testID={`add-to-${item.id}`}>
          <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="map-outline" size={22} color={colors.primaryAccent} />
          </View>
          <View style={styles.copy}>
            <Text numberOfLines={1} style={[styles.label, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.caption, { color: colors.mutedForeground }]}>
              {item.stops_count} {item.stops_count === 1 ? 'parada' : 'paradas'}
            </Text>
          </View>
          <Ionicons name="add" size={22} color={colors.primaryAccent} />
        </Pressable>
      )}
      // Audit A37: the existing itineraries first, a new one last.
      ListFooterComponent={
        composing || items.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            <TextField
              label="Nome do novo roteiro"
              value={name}
              onChangeText={setName}
              maxLength={120}
              placeholder="Ex.: Sábado no centro"
              returnKeyType="done"
              onSubmitEditing={createAndAdd}
            />
            <Button
              label="Criar e adicionar"
              size={52}
              fill
              disabled={!name.trim() || busy}
              onPress={createAndAdd}
              testID="create-and-add"
            />
          </View>
        ) : (
          <Button label="Novo roteiro" icon="add" variant="outline" size={52} fill onPress={() => setComposing(true)} testID="new-itinerary" />
        )
      }
    />
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, padding: spacing.gutter, paddingBottom: spacing.xxl },
  header: { gap: spacing.md },
  done: { flex: 1, padding: spacing.gutter },
  card: { alignItems: 'stretch', borderRadius: radius.card, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  badge: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: radius.pill, height: 48, justifyContent: 'center', width: 48 },
  row: {
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
  title: typography.title,
  body: typography.body,
  label: { ...typography.body, ...textWeight('700') },
  caption: typography.meta,
})
