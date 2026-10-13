import { useRouter } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { useContentFrame } from '@/components/content-frame'
import { ContentSkeleton } from '@/components/content-skeleton'
import { EmptyState } from '@/components/empty-state'
import { usePullToRefresh } from '@/components/pull-to-refresh'
import { TROUBLESHOOTING_HELP } from '@/help/help-link'
import { radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { FIRST_USE_MESSAGE, hasAnyUse, useSavings } from './savings'
import { HowWeCount, RecapCard, SavingsStats, TopPlaces } from './savings-view'

/**
 * "Sua economia": this edition's numbers and a recap of every closed edition,
 * each with its most visited places, and how the money is counted.
 */
export function SavingsScreen() {
  const colors = useColors()
  const router = useRouter()
  const frame = useContentFrame(undefined, spacing.lg)
  const savings = useSavings()
  const refreshControl = usePullToRefresh(savings.refetch)

  // Offline, the first read pauses: the skeleton says what it is waiting for.
  if (savings.isPending) {
    return <ContentSkeleton label="Carregando sua economia" variant="detail" />
  }

  if (!savings.data) {
    return (
      <View style={[styles.fill, frame.padding, { backgroundColor: colors.background }]}>
        <EmptyState
          testID="savings-screen-error"
          icon="cloud-offline-outline"
          title="Não foi possível carregar sua economia"
          action={{ label: 'Tentar de novo', onPress: () => void savings.refetch() }}
          help={TROUBLESHOOTING_HELP}
        />
      </View>
    )
  }

  const { current, past } = savings.data

  if (!hasAnyUse(savings.data)) {
    return (
      <View style={[styles.fill, frame.padding, { backgroundColor: colors.background }]}>
        <EmptyState
          testID="savings-screen-empty"
          icon="wallet-outline"
          title={FIRST_USE_MESSAGE}
          text="Cada uso conta os lugares visitados e quanto você economizou."
          action={{ label: 'Ver meus benefícios', onPress: () => router.navigate('/wallet') }}
        />
      </View>
    )
  }

  const panel = [styles.panel, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.page, frame.padding]}
      refreshControl={refreshControl}
    >
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
          Nesta edição
        </Text>
        <View style={panel}>
          {current.benefits_used > 0 ? (
            <>
              {current.editions.length > 0 ? (
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {current.editions.map((edition) => edition.name).join(' · ')}
                </Text>
              ) : null}
              <SavingsStats totals={current} />
              <TopPlaces places={current.top_places} />
            </>
          ) : (
            <Text style={[styles.panelTitle, { color: colors.foreground }]}>
              {FIRST_USE_MESSAGE}
            </Text>
          )}
        </View>
      </View>

      {past.length > 0 ? (
        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
            Edições anteriores
          </Text>
          {past.map((recap) => (
            <View key={recap.edition.id} style={panel}>
              <RecapCard recap={recap} />
              <TopPlaces places={recap.top_places} />
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
          Como calculamos a economia
        </Text>
        <View style={panel}>
          <HowWeCount folded={false} />
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.section, paddingVertical: spacing.lg },
  fill: { flex: 1, justifyContent: 'center', paddingVertical: spacing.xxl },
  section: { gap: spacing.md },
  title: typography.heading,
  panel: { borderRadius: radius.card, borderWidth: 1, gap: spacing.md, padding: 18 },
  panelTitle: { ...typography.label, ...textWeight('700') },
  meta: typography.meta,
})
