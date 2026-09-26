import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import type { Interest } from '@/api/explorer'
import { useCategories } from '@/catalog/queries'
import { useSelectedCity } from '@/catalog/city-store'
import { ContentSkeleton } from '@/components/content-skeleton'
import { interestOptions, selectionChanged } from '@/explorer/interest-options'
import { useInterests, useReplaceInterests } from '@/explorer/queries'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * Choosing interests — Anexo I item 10.
 *
 * Saving sends the whole set, because that is what the screen shows: a list
 * with checkmarks, not a sequence of separate decisions.
 *
 * What an interest does is said plainly: it feeds the "Para você" row in
 * Explorar (ADR-0030), and the copy names that row instead of promising a
 * personalised search the server does not compute.
 */
export default function InterestsScreen() {
  const city = useSelectedCity()
  const interests = useInterests()
  const categories = useCategories(city)
  // Held here, above the remount below: saving replaces the server's set, the
  // form starts over from it, and the confirmation must survive that.
  const save = useReplaceInterests()

  if (interests.isPending || (city && categories.isPending)) {
    return <ContentSkeleton label="Carregando interesses" variant="catalog" />
  }

  return (
    <InterestsForm
      // Remounts once the server's set arrives, so local state starts from it
      // instead of being synchronised by an effect.
      key={(interests.data?.data ?? []).map((interest) => interest.category.slug).join(',')}
      chosen={interests.data?.data ?? []}
      cityCategories={categories.data?.categories ?? []}
      hasCity={Boolean(city)}
      failed={interests.isError}
      save={save}
    />
  )
}

function InterestsForm({
  chosen,
  cityCategories,
  hasCity,
  failed,
  save,
}: {
  chosen: Interest[]
  cityCategories: { slug: string; name: string }[]
  hasCity: boolean
  failed: boolean
  save: ReturnType<typeof useReplaceInterests>
}) {
  const colors = useColors()
  const [selected, setSelected] = useState(
    () => new Set(chosen.map((interest) => interest.category.slug))
  )

  const options = interestOptions(cityCategories, chosen)
  const changed = selectionChanged(selected, chosen)

  const toggle = (slug: string) =>
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <Text style={[styles.lead, { color: colors.mutedForeground }]}>
        Marque o que você gosta de explorar. Usamos seus interesses no Para você, em Explorar.
      </Text>

      {failed ? (
        <Text style={[styles.lead, { color: colors.destructiveAccent }]}>
          Não foi possível carregar seus interesses agora.
        </Text>
      ) : null}

      {!hasCity && options.length === 0 ? (
        <Text style={[styles.lead, { color: colors.mutedForeground }]}>
          Escolha uma cidade na aba Explorar para ver as categorias disponíveis.
        </Text>
      ) : null}

      <View style={styles.options} accessibilityRole="list">
        {options.map((option) => {
          const checked = selected.has(option.slug)
          return (
            <Pressable
              key={option.slug}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={
                option.retired ? `${option.name}, não oferecida no momento` : option.name
              }
              onPress={() => toggle(option.slug)}
              testID={`interest-${option.slug}`}
              style={[
                styles.option,
                {
                  backgroundColor: checked ? colors.primarySoft : colors.surfaceRaised,
                  borderColor: checked ? colors.primary : colors.border,
                },
              ]}>
              <Ionicons
                name={checked ? 'checkbox' : 'square-outline'}
                size={22}
                color={checked ? colors.primary : colors.mutedForeground}
                accessible={false}
              />
              <View style={styles.optionText}>
                <Text style={[styles.optionName, { color: colors.foreground }]}>{option.name}</Text>
                {option.retired ? (
                  <Text style={[styles.optionNote, { color: colors.mutedForeground }]}>
                    Não oferecida no momento
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )
        })}
      </View>

      {save.isError ? (
        <Text style={[styles.lead, { color: colors.destructiveAccent }]}>
          Não foi possível salvar agora.
        </Text>
      ) : save.isSuccess && !changed ? (
        <Text style={[styles.lead, { color: colors.successAccent }]}>Interesses salvos.</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={!changed || save.isPending}
        onPress={() => save.mutate([...selected])}
        style={[
          styles.save,
          { backgroundColor: colors.primary, opacity: !changed || save.isPending ? 0.5 : 1 },
        ]}
        testID="save-interests">
        <Text style={[styles.saveLabel, { color: colors.primaryForeground }]}>
          {save.isPending ? 'Salvando…' : 'Salvar interesses'}
        </Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg, padding: spacing.lg },
  lead: typography.body,
  options: { gap: spacing.sm },
  option: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  optionText: { flex: 1, gap: spacing.xs },
  optionName: { ...typography.body, fontWeight: '600' },
  optionNote: typography.caption,
  save: { alignItems: 'center', borderRadius: radius.md, justifyContent: 'center', minHeight: 48 },
  saveLabel: { ...typography.body, fontWeight: '600' },
})
