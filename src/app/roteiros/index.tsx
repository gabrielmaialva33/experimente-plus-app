import { useRouter } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { ContentSkeleton } from '@/components/content-skeleton'
import { useCreateItinerary, useItineraries } from '@/explorer/queries'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * The person's itineraries — Anexo I item 10.
 *
 * Private to them by design (ADR-0030): nothing on this screen is visible to
 * anyone else, and the copy does not suggest otherwise.
 */
export default function ItinerariesScreen() {
  const colors = useColors()
  const router = useRouter()
  const query = useItineraries()
  const create = useCreateItinerary()
  const [name, setName] = useState('')

  if (query.isPending) return <ContentSkeleton label="Carregando seus roteiros" variant="catalog" />

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    create.mutate(
      { name: trimmed },
      {
        onSuccess: (itinerary) => {
          setName('')
          router.push(`/roteiros/${itinerary.id}`)
        },
      }
    )
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.list}
      data={query.data?.data ?? []}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <View style={[styles.create, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <Text style={[styles.lead, { color: colors.mutedForeground }]}>
            Seus roteiros são só seus. Monte uma sequência de lugares para um dia ou um passeio.
          </Text>
          <TextInput
            accessibilityLabel="Nome do novo roteiro"
            value={name}
            onChangeText={setName}
            maxLength={120}
            placeholder="Ex.: Sábado no centro"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="done"
            onSubmitEditing={submit}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            testID="new-itinerary-name"
          />
          {create.isError ? (
            <Text style={[styles.lead, { color: colors.destructiveAccent }]}>
              Não foi possível criar o roteiro agora.
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={!name.trim() || create.isPending}
            onPress={submit}
            style={[
              styles.primary,
              { backgroundColor: colors.primary, opacity: !name.trim() || create.isPending ? 0.5 : 1 },
            ]}
            testID="create-itinerary">
            <Text style={[styles.primaryLabel, { color: colors.primaryForeground }]}>
              {create.isPending ? 'Criando…' : 'Criar roteiro'}
            </Text>
          </Pressable>
        </View>
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          {query.isError ? 'Não foi possível carregar seus roteiros agora.' : 'Nenhum roteiro ainda.'}
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${item.name}, ${item.stops_count} ${item.stops_count === 1 ? 'parada' : 'paradas'}`}
          onPress={() => router.push(`/roteiros/${item.id}`)}
          style={[styles.card, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
          testID={`itinerary-${item.id}`}>
          <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {item.stops_count} {item.stops_count === 1 ? 'parada' : 'paradas'}
          </Text>
        </Pressable>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, padding: spacing.lg },
  create: { borderRadius: radius.surface, borderWidth: 1, gap: spacing.md, marginBottom: spacing.md, padding: spacing.lg },
  lead: typography.body,
  input: { ...typography.body, borderRadius: radius.md, borderWidth: 1, minHeight: 48, paddingHorizontal: spacing.md },
  primary: { alignItems: 'center', borderRadius: radius.md, justifyContent: 'center', minHeight: 48 },
  primaryLabel: { ...typography.body, fontWeight: '600' },
  empty: { ...typography.body, padding: spacing.lg, textAlign: 'center' },
  card: { borderRadius: radius.surface, borderWidth: 1, gap: spacing.xs, padding: spacing.lg },
  name: { ...typography.body, fontWeight: '600' },
  meta: typography.caption,
})
