import Ionicons from '@expo/vector-icons/Ionicons'
import { Stack, useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { selectCity, useSelectedCity } from '@/catalog/city-store'
import { useCities } from '@/catalog/queries'
import { ContentSkeleton } from '@/components/content-skeleton'
import { EmptyState } from '@/components/empty-state'
import { spacing, textWeight, typography, radius } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * The city Explorar opens on, chosen from the account's preferences (audit
 * A23). It is the same local discovery state Explorar's own selector writes
 * (ADR-0023 §3): no request, no change of operation.
 */
export default function CityScreen() {
  const colors = useColors()
  const router = useRouter()
  const selected = useSelectedCity()
  const cities = useCities()

  const choose = (slug: string) => {
    selectCity(slug)
    router.back()
  }

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Stack.Screen options={{ title: 'Cidade' }} />
      {cities.isPending ? (
        <ContentSkeleton label="Carregando cidades" variant="catalog" />
      ) : cities.isError ? (
        <View style={styles.page}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Não foi possível carregar as cidades"
            action={{ label: 'Tentar de novo', onPress: () => void cities.refetch() }}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.page}>
          <Text style={[styles.lead, { color: colors.mutedForeground }]}>
            Explorar abre nesta cidade. Você pode trocar quando quiser.
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Cidade"
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
            {(cities.data ?? []).map((city) => {
              const checked = city.slug === selected
              return (
                <Pressable
                  key={city.slug}
                  accessibilityRole="radio"
                  accessibilityLabel={`${city.name}, ${city.state_code}`}
                  accessibilityState={{ checked, selected: checked }}
                  onPress={() => choose(city.slug)}
                  style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.muted : 'transparent' }]}>
                  <View style={styles.copy}>
                    <Text style={[styles.name, { color: colors.foreground }]}>{city.name}</Text>
                    <Text style={[styles.state, { color: colors.mutedForeground }]}>{city.state_code}</Text>
                  </View>
                  <Ionicons
                    name={checked ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={checked ? colors.primary : colors.choiceBorder}
                  />
                </Pressable>
              )
            })}
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg, padding: spacing.gutter },
  lead: typography.body,
  card: { borderRadius: radius.card, borderWidth: 1, overflow: 'hidden', paddingVertical: spacing.xs },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  copy: { flex: 1, gap: 2 },
  name: { ...typography.body, ...textWeight('600') },
  state: typography.meta,
})
