import Ionicons from '@expo/vector-icons/Ionicons'
import type { UseQueryResult } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

import { useLoadingCopy } from '@/api/online'
import { Button } from '@/components/button'
import { decorative } from '@/components/decorative'
import { LinkCard } from '@/components/link-card'
import { useStackedLayout } from '@/theme/font-scale'
import { minTouch, radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import {
  FIRST_USE_MESSAGE,
  HOW_WE_COUNT,
  hasAnyUse,
  recapSentence,
  savingsAmount,
  visitsLabel,
  withoutEstimateNote,
  type PastSavings,
  type Savings,
  type SavingsTotals,
} from './savings'

type SavingsQuery = Pick<UseQueryResult<Savings>, 'data' | 'isError' | 'refetch'>

/** A number and what it counts; read as one sentence ("Lugares visitados: 4"). */
function Stat({
  label,
  value,
  style,
}: {
  label: string
  value: string
  style?: StyleProp<ViewStyle>
}) {
  const colors = useColors()
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[
        styles.stat,
        { backgroundColor: colors.background, borderColor: colors.borderSubtle },
        style,
      ]}
    >
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  )
}

/** Places, uses and money of a period; side by side until the text grows. */
export function SavingsStats({ totals }: { totals: SavingsTotals }) {
  const colors = useColors()
  const stacked = useStackedLayout()
  const amount = savingsAmount(totals)
  const note = withoutEstimateNote(totals)

  return (
    <View style={styles.stats}>
      <View testID="savings-counts" style={[styles.row, stacked && styles.column]}>
        <Stat
          label="Lugares visitados"
          value={totals.places_visited.toLocaleString('pt-BR')}
          style={!stacked && styles.share}
        />
        <Stat
          label="Benefícios usados"
          value={totals.benefits_used.toLocaleString('pt-BR')}
          style={!stacked && styles.share}
        />
      </View>
      <View
        accessible
        accessibilityLabel={
          amount
            ? `${amount.estimated ? 'Economia estimada' : 'Economia'}: ${amount.spoken}`
            : 'Economia: estes usos não têm valor em reais'
        }
        style={[styles.money, { backgroundColor: colors.successSoft }]}
      >
        <Text style={[styles.statLabel, { color: colors.successAccent }]}>
          {amount?.estimated ? 'Economia estimada' : 'Economia'}
        </Text>
        <Text style={[styles.moneyValue, { color: colors.successAccent }]}>
          {amount ? amount.text : 'Sem valor em reais'}
        </Text>
      </View>
      {note ? <Text style={[styles.note, { color: colors.mutedForeground }]}>{note}</Text> : null}
    </View>
  )
}

export function TopPlaces({ places }: { places: SavingsTotals['top_places'] }) {
  const colors = useColors()
  if (places.length === 0) return null
  return (
    <View style={styles.places}>
      <Text accessibilityRole="header" style={[styles.overline, { color: colors.mutedForeground }]}>
        Lugares mais visitados
      </Text>
      {/* Two places may share a name (a chain in two cities): the position keeps them apart. */}
      {places.map((place, index) => (
        <View
          key={`${index}-${place.name}`}
          accessible
          accessibilityLabel={`${place.name}, ${visitsLabel(place.visits)}`}
          style={[styles.place, { borderColor: colors.borderSubtle }]}
        >
          <Text style={[styles.placeName, { color: colors.foreground }]}>{place.name}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {visitsLabel(place.visits)}
          </Text>
        </View>
      ))}
    </View>
  )
}

/** "Em 2025 você visitou 4 lugares e economizou cerca de R$ 120,00." */
export function RecapCard({ recap }: { recap: PastSavings }) {
  const colors = useColors()
  const sentence = recapSentence(recap.edition.year, recap)
  return (
    <View
      testID={`savings-recap-${recap.edition.id}`}
      accessible
      accessibilityLabel={`${recap.edition.name}. ${sentence.spoken}`}
      style={[styles.recap, { backgroundColor: colors.successSoft }]}
    >
      <Text style={[styles.overline, { color: colors.successAccent }]}>{recap.edition.name}</Text>
      <Text style={[styles.recapText, { color: colors.successAccent }]}>{sentence.text}</Text>
    </View>
  )
}

/** Where the numbers come from. Folded in the wallet, open on the full screen. */
export function HowWeCount({ folded = true }: { folded?: boolean }) {
  const colors = useColors()
  const [open, setOpen] = useState(!folded)
  const text = (
    <View testID="savings-how" style={styles.how}>
      {HOW_WE_COUNT.map((line) => (
        <Text key={line} style={[styles.meta, { color: colors.mutedForeground }]}>
          • {line}
        </Text>
      ))}
    </View>
  )
  if (!folded) return text

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Como calculamos a economia"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={styles.toggle}
      >
        <Text style={[styles.toggleLabel, { color: colors.primary }]}>
          Como calculamos a economia
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.primary}
          {...decorative}
        />
      </Pressable>
      {open ? text : null}
    </View>
  )
}

/**
 * "Sua economia" in the Carteira: this edition's numbers, the recap of the last
 * closed one and the way to the full screen. Its own states, so a failure here
 * never hides the benefits above it.
 */
export function SavingsBlock({ query, onOpen }: { query: SavingsQuery; onOpen: () => void }) {
  const colors = useColors()
  const loading = useLoadingCopy('Carregando sua economia')
  const panel = [styles.panel, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]

  let body: ReactNode
  if (query.data) {
    body = <SavingsSummary savings={query.data} onOpen={onOpen} />
  } else if (query.isError) {
    body = (
      <View testID="savings-error" style={panel}>
        <Text style={[styles.panelTitle, { color: colors.foreground }]}>
          Não foi possível carregar sua economia
        </Text>
        <Button
          label="Tentar de novo"
          accessibilityLabel="Tentar de novo: carregar sua economia"
          variant="outline"
          size={44}
          icon="refresh"
          onPress={() => void query.refetch()}
        />
      </View>
    )
  } else {
    // Offline, the query layer pauses the read: the copy says what it waits for.
    body = (
      <View
        testID="savings-loading"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={loading}
        accessibilityState={{ busy: true }}
        style={panel}
      >
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>{loading}</Text>
      </View>
    )
  }

  return (
    <View testID="wallet-savings" style={styles.section}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.foreground }]}>
        Sua economia
      </Text>
      {body}
    </View>
  )
}

function SavingsSummary({ savings, onOpen }: { savings: Savings; onOpen: () => void }) {
  const colors = useColors()
  const { current, past } = savings
  const [latest] = past

  if (!hasAnyUse(savings)) {
    return (
      <View
        testID="savings-empty"
        style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
      >
        <Text style={[styles.panelTitle, { color: colors.foreground }]}>{FIRST_USE_MESSAGE}</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          Cada uso conta os lugares visitados e quanto você economizou.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.summary}>
      <View
        style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
      >
        {current.benefits_used > 0 ? (
          <>
            {current.editions.length > 0 ? (
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                Nesta edição: {current.editions.map((edition) => edition.name).join(' · ')}
              </Text>
            ) : null}
            <SavingsStats totals={current} />
          </>
        ) : (
          <Text style={[styles.panelTitle, { color: colors.foreground }]}>{FIRST_USE_MESSAGE}</Text>
        )}
        <HowWeCount />
      </View>
      {latest ? <RecapCard recap={latest} /> : null}
      <LinkCard
        testID="savings-open"
        icon="stats-chart-outline"
        title="Ver sua economia"
        subtitle="Por edição, com os lugares mais visitados"
        onPress={onOpen}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  sectionTitle: typography.title,
  summary: { gap: spacing.md },
  panel: { borderRadius: radius.card, borderWidth: 1, gap: spacing.md, padding: 18 },
  panelTitle: { ...typography.label, ...textWeight('700') },
  stats: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  column: { flexDirection: 'column' },
  stat: { borderRadius: radius.surface, borderWidth: 1, gap: spacing.xs, padding: spacing.md },
  // Two halves of the row; stacked, each takes its own height instead.
  share: { flexBasis: 0, flexGrow: 1 },
  statLabel: typography.overline,
  statValue: typography.title,
  money: { borderRadius: radius.surface, gap: spacing.xs, padding: spacing.md },
  moneyValue: typography.title,
  note: typography.caption,
  meta: typography.meta,
  overline: typography.overline,
  places: { gap: spacing.xs },
  place: {
    alignItems: 'baseline',
    borderTopWidth: StyleSheet.hairlineWidth,
    columnGap: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  placeName: { ...typography.label, flexShrink: 1 },
  recap: { borderRadius: radius.card, gap: spacing.xs, padding: 18 },
  recapText: typography.heading,
  how: { gap: spacing.xs },
  toggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: minTouch,
  },
  toggleLabel: { ...typography.label, flexShrink: 1 },
})
