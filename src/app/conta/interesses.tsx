import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import type { Interest } from '@/api/explorer'
import { useCategories } from '@/catalog/queries'
import { useSelectedCity } from '@/catalog/city-store'
import { Button } from '@/components/button'
import { Checkbox } from '@/components/checkbox'
import { ContentSkeleton } from '@/components/content-skeleton'
import { EmptyState } from '@/components/empty-state'
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
        <Text accessibilityRole="alert" style={[styles.lead, { color: colors.destructiveAccent }]}>
          Não foi possível carregar seus interesses agora.
        </Text>
      ) : null}

      {!hasCity && options.length === 0 ? <ChooseCity /> : null}

      {options.length > 0 ? (
        <View
          accessibilityRole="list"
          style={[styles.options, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
          {options.map((option) => (
            // Audit A55: the same box as every other checkbox of the app.
            <View key={option.slug} style={styles.option}>
              <Checkbox
                label={option.name}
                hint={option.retired ? 'Não oferecida no momento' : null}
                accessibilityLabel={option.retired ? `${option.name}, não oferecida no momento` : option.name}
                checked={selected.has(option.slug)}
                onPress={() => toggle(option.slug)}
                testID={`interest-${option.slug}`}
              />
            </View>
          ))}
        </View>
      ) : null}

      {save.isError ? (
        <Text accessibilityRole="alert" style={[styles.lead, { color: colors.destructiveAccent }]}>
          Não foi possível salvar agora.
        </Text>
      ) : save.isSuccess && !changed ? (
        <Text style={[styles.lead, { color: colors.successAccent }]}>Interesses salvos.</Text>
      ) : null}

      <Button
        label={save.isPending ? 'Salvando…' : 'Salvar interesses'}
        accessibilityLabel="Salvar interesses"
        size={52}
        fill
        disabled={!changed || save.isPending}
        onPress={() => save.mutate([...selected])}
        testID="save-interests"
      />
    </ScrollView>
  )
}

/** Categories are a city's; without one there is nothing to choose from yet. */
function ChooseCity() {
  const router = useRouter()
  return (
    <EmptyState
      icon="location-outline"
      title="Escolha uma cidade"
      text="As categorias que você pode marcar dependem da cidade."
      action={{ label: 'Escolher cidade', onPress: () => router.push('/conta/cidade') }}
    />
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg, padding: spacing.gutter, paddingBottom: spacing.xxl },
  lead: typography.body,
  options: { borderRadius: radius.card, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  option: { minHeight: 52, justifyContent: 'center' },
})
