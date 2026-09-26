import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { Itinerary } from '@/api/explorer'
import { Button } from '@/components/button'
import { ContentSkeleton } from '@/components/content-skeleton'
import { EmptyState } from '@/components/empty-state'
import { IconButton } from '@/components/icon-button'
import { KeyboardForm } from '@/components/keyboard-form'
import { SectionHeader } from '@/components/section-header'
import { TextField } from '@/components/text-field'
import { EstablishmentCardRow } from '@/explorer/establishment-card-row'
import { moveStop } from '@/explorer/itinerary-order'
import {
  useAddItineraryStop,
  useDeleteItinerary,
  useItinerary,
  useRemoveItineraryStop,
  useReorderItineraryStops,
  useSavedList,
  useUpdateItinerary,
} from '@/explorer/queries'
import { minTouch, radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export default function ItineraryScreen() {
  const colors = useColors()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const itineraryId = Number(id)
  const query = useItinerary(Number.isInteger(itineraryId) && itineraryId > 0 ? itineraryId : null)

  if (query.isPending) return <ContentSkeleton label="Carregando roteiro" variant="catalog" />

  if (!query.data) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background, flex: 1 }]}>
        <EmptyState
          icon="map-outline"
          title="Este roteiro não foi encontrado."
          action={{ label: 'Ver meus roteiros', onPress: () => router.replace('/roteiros') }}
        />
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
  const [adding, setAdding] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const stopIds = itinerary.stops.map((stop) => stop.id)
  const busy = reorder.isPending || remove.isPending

  // Audit A26: the name is kept when the field is left, as a label would be;
  // there is no separate button to find. An emptied name goes back to the saved one.
  const saveName = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setName(itinerary.name)
      return
    }
    if (trimmed !== itinerary.name && !rename.isPending) rename.mutate({ name: trimmed, notes: itinerary.notes })
  }

  const move = (index: number, delta: -1 | 1) => {
    const next = moveStop(stopIds, index, delta)
    if (next !== stopIds) reorder.mutate(next)
  }

  const nameStatus = rename.isPending
    ? 'Salvando…'
    : rename.isError
      ? null
      : rename.isSuccess && name.trim() === itinerary.name
        ? 'Nome salvo.'
        : null

  return (
    <KeyboardForm style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <TextField
        label="Nome do roteiro"
        value={name}
        onChangeText={setName}
        onBlur={saveName}
        onSubmitEditing={saveName}
        returnKeyType="done"
        maxLength={120}
        error={rename.isError ? 'Não foi possível salvar o nome agora.' : null}
        hint={nameStatus}
        testID="itinerary-name"
      />

      <SectionHeader
        title="Paradas"
        hint={
          itinerary.stops.length === 0
            ? null
            : `${itinerary.stops.length} ${itinerary.stops.length === 1 ? 'parada' : 'paradas'}`
        }
      />

      {itinerary.stops.length === 0 && !adding ? (
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          Nenhuma parada ainda. Adicione lugares dos seus favoritos ou toque em Roteiro na página de um lugar.
        </Text>
      ) : null}

      {reorder.isError || remove.isError ? (
        <Text accessibilityRole="alert" style={[styles.body, { color: colors.destructiveAccent }]}>
          Não foi possível alterar o roteiro agora.
        </Text>
      ) : null}

      {itinerary.stops.map((stop, index) => (
        <View
          key={stop.id}
          style={[styles.stop, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
          testID={`stop-${stop.id}`}>
          <View style={styles.stopHead}>
            <View style={[styles.position, { backgroundColor: colors.primary }]}>
              <Text style={[styles.positionLabel, { color: colors.primaryForeground }]}>{index + 1}</Text>
            </View>
            <View style={styles.stopBody}>
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
            </View>
          </View>

          {stop.note ? (
            <Text style={[styles.body, { color: colors.foreground }]}>{stop.note}</Text>
          ) : null}

          <View style={styles.stopActions}>
            <StopButton
              label={`Mover parada ${index + 1} para cima`}
              icon="arrow-up"
              disabled={busy || index === 0}
              onPress={() => move(index, -1)}
              testID={`stop-${stop.id}-up`}
            />
            <StopButton
              label={`Mover parada ${index + 1} para baixo`}
              icon="arrow-down"
              disabled={busy || index === itinerary.stops.length - 1}
              onPress={() => move(index, 1)}
              testID={`stop-${stop.id}-down`}
            />
            <View style={styles.spacer} />
            <StopButton
              label={`Remover parada ${index + 1}`}
              icon="trash-outline"
              disabled={busy}
              onPress={() => remove.mutate(stop.id)}
              testID={`stop-${stop.id}-remove`}
            />
          </View>
        </View>
      ))}

      {/* Audit A25: places are added from inside the itinerary, not only from each place's page. */}
      {adding ? (
        <AddFromFavorites itinerary={itinerary} onClose={() => setAdding(false)} />
      ) : (
        <Button label="Adicionar lugar" icon="add" variant="outline" size={52} fill onPress={() => setAdding(true)} testID="add-stop" />
      )}

      {confirmingDelete ? (
        <View style={[styles.stop, { backgroundColor: colors.destructiveSoft, borderColor: colors.destructive }]}>
          <Text style={[styles.body, { color: colors.foreground }]}>
            Excluir este roteiro e todas as paradas? Isso não pode ser desfeito.
          </Text>
          <View style={styles.confirm}>
            <Button label="Cancelar" variant="ghost" onPress={() => setConfirmingDelete(false)} />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: destroy.isPending }}
              disabled={destroy.isPending}
              onPress={() =>
                destroy.mutate(itinerary.id, { onSuccess: () => router.replace('/roteiros') })
              }
              style={[styles.destroy, { backgroundColor: colors.destructive }]}
              testID="confirm-delete-itinerary">
              <Text style={[styles.destroyLabel, { color: colors.destructiveForeground }]}>Excluir</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setConfirmingDelete(true)}
          style={styles.deleteLink}
          testID="delete-itinerary">
          <Text style={[styles.deleteLabel, { color: colors.destructiveAccent }]}>Excluir roteiro</Text>
        </Pressable>
      )}
    </KeyboardForm>
  )
}

/**
 * The person's favourite places, offered as stops. A place already in the
 * itinerary is left out; anything else is found in Explorar.
 */
function AddFromFavorites({ itinerary, onClose }: { itinerary: Itinerary; onClose: () => void }) {
  const colors = useColors()
  const router = useRouter()
  const favorites = useSavedList('favorites')
  const add = useAddItineraryStop()

  const present = new Set(itinerary.stops.map((stop) => stop.establishment?.id).filter(Boolean))
  const candidates = (favorites.data?.data ?? []).filter((entry) => !present.has(entry.establishment.id))

  return (
    <View style={[styles.stop, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]} testID="add-from-favorites">
      <SectionHeader title="Adicionar dos favoritos" action={{ label: 'Fechar', onPress: onClose }} />
      {favorites.isPending ? (
        <Text style={[styles.body, { color: colors.mutedForeground }]}>Carregando seus favoritos…</Text>
      ) : candidates.length === 0 ? (
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {favorites.isError
            ? 'Não foi possível carregar seus favoritos agora.'
            : 'Nenhum favorito para adicionar. Encontre lugares em Explorar e toque em Roteiro na página deles.'}
        </Text>
      ) : (
        candidates.map((entry) => (
          <EstablishmentCardRow
            key={entry.id}
            card={entry.establishment}
            trailing={
              <IconButton
                icon="add"
                accessibilityLabel={`Adicionar ${entry.establishment.name} ao roteiro`}
                onPress={() => {
                  if (!add.isPending) add.mutate({ id: itinerary.id, establishmentId: entry.establishment.id })
                }}
                testID={`add-stop-${entry.establishment.id}`}
              />
            }
          />
        ))
      )}
      {add.isError ? (
        <Text accessibilityRole="alert" style={[styles.body, { color: colors.destructiveAccent }]}>
          Não foi possível adicionar agora.
        </Text>
      ) : null}
      <Button label="Procurar em Explorar" icon="compass-outline" variant="ghost" onPress={() => router.navigate('/')} />
    </View>
  )
}

function StopButton({
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
  const destructive = icon === 'trash-outline'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={[
        styles.stopButton,
        { borderColor: colors.borderSubtle, opacity: disabled ? 0.4 : 1 },
      ]}>
      <Ionicons
        name={icon}
        size={20}
        color={destructive ? colors.destructiveAccent : colors.primaryAccent}
        accessible={false}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg, padding: spacing.gutter, paddingBottom: spacing.xxl },
  body: typography.body,
  stop: { borderRadius: radius.card, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  stopHead: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  stopBody: { flex: 1 },
  position: { alignItems: 'center', borderRadius: radius.pill, height: 28, justifyContent: 'center', width: 28 },
  positionLabel: { ...typography.meta, ...textWeight('700') },
  stopActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  spacer: { flex: 1 },
  stopButton: { alignItems: 'center', borderRadius: radius.pill, borderWidth: 1, height: minTouch, justifyContent: 'center', width: minTouch },
  confirm: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  destroy: { alignItems: 'center', borderRadius: radius.pill, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.gutter },
  destroyLabel: { ...typography.label, ...textWeight('700') },
  deleteLink: { alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  deleteLabel: { ...typography.label, ...textWeight('600') },
})
