import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import type { Interest } from '@/api/explorer'
import { useCategories } from '@/catalog/queries'
import { useSelectedCity } from '@/catalog/city-store'
import { useAnnouncement } from '@/components/announce'
import { Button } from '@/components/button'
import { Checkbox } from '@/components/checkbox'
import { ContentSkeleton } from '@/components/content-skeleton'
import { EmptyState } from '@/components/empty-state'
import { useContentFrame } from '@/components/content-frame'
import { interestOptions, selectionChanged } from '@/explorer/interest-options'
import { useInterests, useReplaceInterests } from '@/explorer/queries'
import { TROUBLESHOOTING_HELP } from '@/help/help-link'
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

  // Saving replaces the whole set. A form drawn without the saved one would show
  // every box empty, and one tap on "Salvar" would erase what the person chose.
  const failed = interests.isError && !interests.data
  if (failed || (city && categories.isError && !categories.data)) {
    return <Failure onRetry={() => void (failed ? interests.refetch() : categories.refetch())} />
  }

  return (
    <InterestsForm
      // Remounts once the server's set arrives, so local state starts from it
      // instead of being synchronised by an effect.
      key={(interests.data?.data ?? []).map((interest) => interest.category.slug).join(',')}
      chosen={interests.data?.data ?? []}
      cityCategories={categories.data?.categories ?? []}
      hasCity={Boolean(city)}
      save={save}
    />
  )
}

function Failure({ onRetry }: { onRetry: () => void }) {
  const colors = useColors()
  const frame = useContentFrame()
  return (
    <View style={[styles.page, frame.padding, { backgroundColor: colors.background, flex: 1 }]}>
      <EmptyState
        testID="interests-failed"
        icon="cloud-offline-outline"
        title="Não foi possível carregar seus interesses agora"
        text="Confira a conexão e tente de novo."
        action={{ label: 'Tentar de novo', onPress: onRetry }}
        help={TROUBLESHOOTING_HELP}
      />
    </View>
  )
}

function InterestsForm({
  chosen,
  cityCategories,
  hasCity,
  save,
}: {
  chosen: Interest[]
  cityCategories: { slug: string; name: string }[]
  hasCity: boolean
  save: ReturnType<typeof useReplaceInterests>
}) {
  const colors = useColors()
  const frame = useContentFrame()
  const router = useRouter()
  const [selected, setSelected] = useState(
    () => new Set(chosen.map((interest) => interest.category.slug))
  )

  const options = interestOptions(cityCategories, chosen)
  const changed = selectionChanged(selected, chosen)
  useAnnouncement(
    save.isError
      ? 'Não foi possível salvar agora.'
      : save.isSuccess && !changed && 'Interesses salvos.'
  )

  const toggle = (slug: string) =>
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.page, frame.padding]}
    >
      <Text style={[styles.lead, { color: colors.mutedForeground }]}>
        Marque o que você gosta de explorar. Usamos seus interesses no Para você, em Explorar.
      </Text>

      {options.length === 0 ? <ChooseCity hasCity={hasCity} /> : null}

      {options.length > 0 ? (
        <View
          accessibilityRole="list"
          style={[
            styles.options,
            { backgroundColor: colors.card, borderColor: colors.borderSubtle },
          ]}
        >
          {options.map((option) => (
            // Audit A55: the same box as every other checkbox of the app.
            <View key={option.slug} style={styles.option}>
              <Checkbox
                label={option.name}
                hint={option.retired ? 'Não oferecida no momento' : null}
                accessibilityLabel={
                  option.retired ? `${option.name}, não oferecida no momento` : option.name
                }
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

      {/* Saved: the next step is to see what they change, in Para você. */}
      {save.isSuccess && !changed ? (
        <Button
          label="Ver sugestões em Explorar"
          variant="ghost"
          align="center"
          onPress={() => router.navigate('/')}
        />
      ) : null}
    </ScrollView>
  )
}

/**
 * Categories are a city's: without one there is nothing to choose from yet, and
 * a city with none published yet leads to another.
 */
function ChooseCity({ hasCity }: { hasCity: boolean }) {
  const router = useRouter()
  return hasCity ? (
    <EmptyState
      icon="location-outline"
      title="Ainda não há categorias nesta cidade"
      text="Elas aparecem conforme os lugares são publicados. Você pode escolher outra cidade."
      action={{ label: 'Escolher outra cidade', onPress: () => router.push('/conta/cidade') }}
    />
  ) : (
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
  options: {
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  option: { minHeight: 52, justifyContent: 'center' },
})
