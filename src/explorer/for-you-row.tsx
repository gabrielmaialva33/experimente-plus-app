import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { CompactCard } from '@/components/compact-card'
import { coverImage } from '@/components/establishment-cover'
import { SectionHeader } from '@/components/section-header'
import { useForYou } from '@/explorer/queries'
import { useSession } from '@/session/context'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * "Para você" — ADR-0030, revision of 26/09/2026.
 *
 * The one personal piece of Explorar, and so the one piece that reads the
 * session: the rest of the screen stays session-free and a visitor gets it
 * without waiting. Nothing is drawn while the session or the row is loading, or
 * when the row fails — the catalogue does not depend on it, and a placeholder
 * that then vanishes would only make the screen jump.
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
      <View testID="for-you" style={styles.gutter}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Escolher interesses para ver lugares para você"
          onPress={() => router.push('/conta/interesses')}
          style={[styles.invite, { backgroundColor: colors.primarySoft }]}
        >
          <Text style={[styles.inviteText, { color: colors.foreground }]}>
            Escolha seus interesses e veja aqui lugares para você.
          </Text>
          <Text style={[styles.inviteAction, { color: colors.primaryAccent }]}>Escolher interesses</Text>
        </Pressable>
      </View>
    )
  }

  if (row.data.length === 0) return null

  return (
    <View testID="for-you" style={styles.section}>
      {/* Interests choose the places; the hint claims no ranking among them. */}
      <View style={styles.gutter}>
        <SectionHeader title="Para você" hint="Com base nos seus interesses" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {row.data.map((establishment) => (
          <CompactCard
            key={establishment.slug}
            testID={`for-you-${establishment.slug}`}
            title={establishment.name}
            meta={[establishment.primary_category?.name, establishment.address.district].filter(Boolean).join(' · ')}
            image={coverImage(establishment.cover)}
            onPress={() => router.push(`/estabelecimento/${establishment.city.slug}/${establishment.slug}`)}
          />
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  gutter: { paddingHorizontal: spacing.gutter },
  row: { gap: spacing.md, paddingHorizontal: spacing.gutter },
  invite: { borderRadius: radius.card, gap: spacing.xs, padding: spacing.lg },
  inviteText: typography.meta,
  inviteAction: { ...typography.label, ...textWeight('700') },
})
