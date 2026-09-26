import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import type { Itinerary } from '@/api/explorer'
import { ContentSkeleton } from '@/components/content-skeleton'
import { EstablishmentCardRow } from '@/explorer/establishment-card-row'
import { moveStop } from '@/explorer/itinerary-order'
import {
  useDeleteItinerary,
  useItinerary,
  useRemoveItineraryStop,
  useReorderItineraryStops,
  useUpdateItinerary,
} from '@/explorer/queries'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export default function ItineraryScreen() {
  const colors = useColors()
  const { id } = useLocalSearchParams<{ id: string }>()
  const itineraryId = Number(id)
  const query = useItinerary(Number.isInteger(itineraryId) && itineraryId > 0 ? itineraryId : null)

  if (query.isPending) return <ContentSkeleton label="Carregando roteiro" variant="catalog" />

  if (!query.data) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background, flex: 1 }]}>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Este roteiro não foi encontrado.
        </Text>
      </View>
    )
  }

  // Keyed by id so a different itinerary never inherits another's edit state.
  return <ItineraryDetail key={query.data.id} itinerary={query.data} />
}

function ItineraryDetail({ itinerary }: { itinerary: Itinerary }) {
  const colors = useColors()
  const router = useRouter()
  const rename = useUpdateItinerary(itinerary.id)
  const reorder = useReorderItineraryStops(itinerary.id)
  const remove = useRemoveItineraryStop(itinerary.id)
  const destroy = useDeleteItinerary()
  const [name, setName] = useState(itinerary.name)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const stopIds = itinerary.stops.map((stop) => stop.id)
  const busy = reorder.isPending || remove.isPending
  const renamed = name.trim() !== itinerary.name && name.trim().length > 0

  const move = (index: number, delta: -1 | 1) => {
    const next = moveStop(stopIds, index, delta)
    if (next !== stopIds) reorder.mutate(next)
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <View style={[styles.section, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <TextInput
          accessibilityLabel="Nome do roteiro"
          value={name}
          onChangeText={setName}
          maxLength={120}
          style={[styles.nameInput, { borderColor: colors.border, color: colors.foreground }]}
          testID="itinerary-name"
        />
        {renamed ? (
          <Pressable
            accessibilityRole="button"
            disabled={rename.isPending}
            onPress={() => rename.mutate({ name: name.trim(), notes: itinerary.notes })}
            style={[styles.primary, { backgroundColor: colors.primary }]}
            testID="rename-itinerary">
            <Text style={[styles.primaryLabel, { color: colors.primaryForeground }]}>
              {rename.isPending ? 'Salvando…' : 'Salvar nome'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {itinerary.stops.length === 0 ? (
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Nenhuma parada ainda. Abra um estabelecimento e toque em Roteiro para adicioná-lo aqui.
        </Text>
      ) : null}

      {reorder.isError || remove.isError ? (
        <Text style={[styles.body, { color: colors.destructiveAccent }]}>
          Não foi possível alterar o roteiro agora.
        </Text>
      ) : null}

      {itinerary.stops.map((stop, index) => (
        <View
          key={stop.id}
          style={[styles.section, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
          testID={`stop-${stop.id}`}>
          <Text style={[styles.position, { color: colors.mutedForeground }]}>Parada {index + 1}</Text>

          {stop.establishment ? (
            <EstablishmentCardRow
              card={stop.establishment}
              onPress={() =>
                router.push(
                  `/estabelecimento/${stop.establishment!.city_slug}/${stop.establishment!.slug}`
                )
              }
            />
          ) : (
            // The stop is kept even though the place left the catalogue: removing
            // it silently would rewrite a route its author wrote.
            <Text style={[styles.body, { color: colors.mutedForeground }]} testID={`stop-${stop.id}-unavailable`}>
              Este lugar não está disponível no catálogo no momento.
            </Text>
          )}

          {stop.note ? (
            <Text style={[styles.body, { color: colors.foreground }]}>{stop.note}</Text>
          ) : null}

          <View style={styles.stopActions}>
            <IconButton
              label={`Mover parada ${index + 1} para cima`}
              icon="arrow-up"
              disabled={busy || index === 0}
              onPress={() => move(index, -1)}
              testID={`stop-${stop.id}-up`}
            />
            <IconButton
              label={`Mover parada ${index + 1} para baixo`}
              icon="arrow-down"
              disabled={busy || index === itinerary.stops.length - 1}
              onPress={() => move(index, 1)}
              testID={`stop-${stop.id}-down`}
            />
            <IconButton
              label={`Remover parada ${index + 1}`}
              icon="trash-outline"
              disabled={busy}
              onPress={() => remove.mutate(stop.id)}
              testID={`stop-${stop.id}-remove`}
            />
          </View>
        </View>
      ))}

      {confirmingDelete ? (
        <View style={[styles.section, { backgroundColor: colors.destructiveSoft, borderColor: colors.destructive }]}>
          <Text style={[styles.body, { color: colors.foreground }]}>
            Excluir este roteiro e todas as paradas? Isso não pode ser desfeito.
          </Text>
          <View style={styles.stopActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmingDelete(false)}
              style={[styles.secondary, { borderColor: colors.actionSecondaryBorder }]}>
              <Text style={[styles.primaryLabel, { color: colors.actionSecondaryForeground }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={destroy.isPending}
              onPress={() =>
                destroy.mutate(itinerary.id, { onSuccess: () => router.replace('/roteiros') })
              }
              style={[styles.secondary, { borderColor: colors.destructive }]}
              testID="confirm-delete-itinerary">
              <Text style={[styles.primaryLabel, { color: colors.destructiveAccent }]}>Excluir</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setConfirmingDelete(true)}
          style={styles.deleteLink}
          testID="delete-itinerary">
          <Text style={[styles.body, { color: colors.destructiveAccent }]}>Excluir roteiro</Text>
        </Pressable>
      )}
    </ScrollView>
  )
}

function IconButton({
  label,
  icon,
  disabled,
  onPress,
  testID,
}: {
  label: string
  icon: 'arrow-up' | 'arrow-down' | 'trash-outline'
  disabled: boolean
  onPress: () => void
  testID: string
}) {
  const colors = useColors()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[
        styles.iconButton,
        { borderColor: colors.actionSecondaryBorder, opacity: disabled ? 0.4 : 1 },
      ]}>
      <Ionicons name={icon} size={20} color={colors.actionSecondaryForeground} accessible={false} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.md, padding: spacing.lg },
  section: { borderRadius: radius.surface, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  nameInput: { ...typography.title, borderRadius: radius.md, borderWidth: 1, minHeight: 48, paddingHorizontal: spacing.md },
  body: typography.body,
  position: { ...typography.caption, ...textWeight('600') },
  stopActions: { flexDirection: 'row', gap: spacing.sm },
  iconButton: { alignItems: 'center', borderRadius: radius.md, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  primary: { alignItems: 'center', borderRadius: radius.md, justifyContent: 'center', minHeight: 48 },
  primaryLabel: { ...typography.body, ...textWeight('600') },
  secondary: { alignItems: 'center', borderRadius: radius.md, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 48 },
  deleteLink: { alignItems: 'center', minHeight: 48, justifyContent: 'center' },
})
