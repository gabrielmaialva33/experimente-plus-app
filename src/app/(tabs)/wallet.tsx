import { useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useSession } from '@/session/context'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { useWallet } from '@/wallet/queries'
import { AVAILABILITY_LABEL, type WalletBenefit } from '@/wallet/types'

export default function WalletScreen() {
  const colors = useColors()
  const router = useRouter()
  const { status } = useSession()
  const wallet = useWallet()

  if (status !== 'authenticated') {
    return (
      <Centered>
        <Text style={[styles.message, { color: colors.foreground }]}>
          Entre para ver seus benefícios.
        </Text>
      </Centered>
    )
  }

  if (wallet.isPending) {
    return <ActivityIndicator style={styles.center} color={colors.primary} />
  }

  const passes = wallet.data?.passes ?? []

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page}>
        {/* Reaching past uses must not depend on holding a current benefit:
            somebody who spent everything is exactly who has a history. */}
        <Pressable onPress={() => router.push('/carteira/historico')} style={styles.historyLink}>
          <Text style={[styles.actionLabel, { color: colors.primary }]}>Meus usos</Text>
        </Pressable>

        {/* An empty wallet is a valid state, not an error. It explains how
            access appears without inventing a checkout the product lacks. */}
        {passes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.heading, { color: colors.foreground }]}>
              Sua carteira está vazia
            </Text>
            <Text style={[styles.message, { color: colors.mutedForeground }]}>
              Quando você receber acesso a uma edição de benefícios, ela aparece aqui com tudo o que
              dá para usar.
            </Text>
          </View>
        ) : null}

        {passes.map((pass) => (
          <View key={pass.access.id} style={styles.section}>
            <Text style={[styles.heading, { color: colors.foreground }]}>{pass.edition.name}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {pass.edition.city.name} · {pass.edition.city.state_code}
            </Text>

            {pass.benefits.map((benefit) => (
              <BenefitRow
                key={benefit.key}
                benefit={benefit}
                onUse={() =>
                  router.push(
                    `/carteira/apresentar?accessId=${benefit.access_id}&offerId=${benefit.offer_id}`
                  )
                }
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

function BenefitRow({ benefit, onUse }: { benefit: WalletBenefit; onUse: () => void }) {
  const colors = useColors()
  const usable = benefit.availability === 'available'

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>{benefit.title}</Text>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {benefit.establishment.public_name}
      </Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>{benefit.description}</Text>

      {benefit.remaining_redemptions != null ? (
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {benefit.remaining_redemptions} uso(s) restante(s)
        </Text>
      ) : null}

      {usable ? (
        <Pressable
          accessibilityRole="button"
          onPress={onUse}
          style={[styles.action, { backgroundColor: colors.cta }]}>
          <Text style={[styles.actionLabel, { color: colors.ctaForeground }]}>Usar benefício</Text>
        </Pressable>
      ) : (
        // The reason comes from the server, and the action stays disabled.
        <Text style={[styles.unavailable, { color: colors.warning }]}>
          {AVAILABILITY_LABEL[benefit.availability]}
        </Text>
      )}
    </View>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  const colors = useColors()
  return <View style={[styles.center, { backgroundColor: colors.background }]}>{children}</View>
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.xxl },
  section: { gap: spacing.sm, marginBottom: spacing.xl },
  card: { borderRadius: radius.surface, borderWidth: 1, gap: spacing.xs, padding: spacing.lg },
  heading: typography.heading,
  title: { ...typography.body, fontWeight: '700' },
  meta: typography.caption,
  body: typography.body,
  message: { ...typography.body, textAlign: 'center' },
  unavailable: { ...typography.caption, fontWeight: '700' },
  action: {
    alignItems: 'center',
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
  },
  actionLabel: { ...typography.body, fontWeight: '700' },
  historyLink: { alignItems: 'flex-end', paddingBottom: spacing.md },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
})
