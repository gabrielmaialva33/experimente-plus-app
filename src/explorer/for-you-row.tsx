import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { EstablishmentCard } from '@/components/establishment-card'
import { useForYou } from '@/explorer/queries'
import { useSession } from '@/session/context'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * "Para você" — ADR-0030, revision of 26/09/2026.
 *
 * The one personal piece of Explorar, and so the one piece that reads the
 * session: the rest of the screen stays session-free and a visitor gets it
 * without waiting. Nothing is drawn while the session or the row is loading, or
 * when the row fails — the catalogue below does not depend on it, and a
 * placeholder that then vanishes would only make the screen jump.
 *
 * The row only narrows. Its places come in the order search uses without a
 * term, and search itself never changes because of an interest.
 */
export function ForYouRow({ citySlug }: { citySlug: string | null }) {
  const colors = useColors()
  const router = useRouter()
  const { status, context } = useSession()
  const identity =
    status === 'authenticated' && context
      ? { operationId: context.active_operation.id, userId: context.user.id }
      : null
  const forYou = useForYou(identity, citySlug)
  const row = forYou.data

  if (!identity || !row) return null

  if (!row.has_interests) {
    return (
      <View testID="for-you" style={styles.section}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Escolher interesses para ver lugares para você"
          onPress={() => router.push('/conta/interesses')}
          style={[styles.invite, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Text style={[styles.inviteText, { color: colors.mutedForeground }]}>
            Escolha seus interesses e veja aqui lugares para você.
          </Text>
          <Text style={[styles.inviteAction, { color: colors.primary }]}>Escolher interesses</Text>
        </Pressable>
      </View>
    )
  }

  if (row.data.length === 0) return null

  return (
    <View testID="for-you" style={styles.section}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
        Para você
      </Text>
      {/* Honest about the order: interests choose the places, not who comes first. */}
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Pelos seus interesses, em ordem alfabética
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {row.data.map((establishment) => (
          <View key={establishment.slug} style={styles.card}>
            <EstablishmentCard
              establishment={establishment}
              onPress={() =>
                router.push(`/estabelecimento/${establishment.city.slug}/${establishment.slug}`)
              }
            />
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs, paddingTop: spacing.md },
  title: { ...typography.body, fontWeight: '700', paddingHorizontal: spacing.lg },
  hint: { ...typography.caption, paddingHorizontal: spacing.lg },
  row: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  card: { width: 264 },
  invite: {
    borderRadius: radius.surface,
    borderWidth: 1,
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
  },
  inviteText: typography.caption,
  inviteAction: { ...typography.body, fontWeight: '700' },
})
