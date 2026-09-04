import { useMutation, useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { ApiError } from '@/api/client'
import { confirmRedemption, previewRedemption } from '@/api/redemptions'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import type { Receipt } from '@/wallet/types'

/**
 * Preview and confirmation.
 *
 * The preview is a read: it shows who the holder is and what the benefit allows,
 * and it never redeems. Confirmation is a separate, deliberate act. Because the
 * server is idempotent by nonce, retrying a confirmation after a timeout
 * returns the original receipt rather than creating a second use.
 */
export default function ConfirmRedemptionScreen() {
  const colors = useColors()
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token: string }>()

  const preview = useQuery({
    queryKey: ['redemption-preview', token],
    queryFn: () => previewRedemption(token as string),
    enabled: Boolean(token),
    retry: false,
  })

  const confirm = useMutation({
    mutationFn: () => confirmRedemption(token as string),
    retry: false,
  })

  if (confirm.data) {
    return <ReceiptView receipt={confirm.data} onDone={() => router.back()} />
  }

  if (preview.isPending) {
    return <ActivityIndicator style={styles.center} color={colors.primary} />
  }

  if (preview.isError) {
    const status = preview.error instanceof ApiError ? preview.error.status : 0

    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.foreground }]}>
          {status === 404 || status === 422
            ? 'Este código não vale mais. Peça ao cliente para gerar um novo.'
            : status === 403
              ? 'Sua conta não pode validar este benefício.'
              : 'Não foi possível ler este código agora.'}
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.link, { color: colors.cta }]}>Voltar ao leitor</Text>
        </Pressable>
      </View>
    )
  }

  const { holder, benefit } = preview.data!

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.page}>
      <Text style={[styles.heading, { color: colors.foreground }]}>Confirmar utilização</Text>

      <Field label="Cliente" value={holder.full_name} />
      <Field label="Unidade" value={benefit.establishment_name} />
      <Field label="Benefício" value={benefit.offer_title} />
      <Field label="Edição" value={benefit.edition_name} />
      <Field label="Usos restantes" value={String(benefit.remaining_redemptions)} />
      {benefit.terms ? <Field label="Regras" value={benefit.terms} /> : null}

      {confirm.isError ? (
        <Text style={[styles.message, { color: colors.warning }]}>
          A confirmação não completou. Tentar de novo é seguro: se o uso já foi registrado, o mesmo
          comprovante será devolvido.
        </Text>
      ) : null}

      {/* Explicit human intent. Nothing here confirms automatically. */}
      <Pressable
        accessibilityRole="button"
        disabled={confirm.isPending}
        onPress={() => confirm.mutate()}
        style={[styles.action, { backgroundColor: colors.cta, opacity: confirm.isPending ? 0.6 : 1 }]}>
        <Text style={[styles.actionLabel, { color: colors.ctaForeground }]}>
          {confirm.isPending ? 'Confirmando…' : 'Confirmar utilização'}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()}>
        <Text style={[styles.link, { color: colors.mutedForeground }]}>Cancelar</Text>
      </Pressable>
    </ScrollView>
  )
}

function ReceiptView({ receipt, onDone }: { receipt: Receipt; onDone: () => void }) {
  const colors = useColors()

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page}>
      <Text style={[styles.heading, { color: colors.success }]}>Utilização registrada</Text>

      <Field label="Comprovante" value={receipt.receipt_code} />
      <Field label="Cliente" value={receipt.holder.full_name} />
      <Field label="Unidade" value={receipt.establishment.name} />
      <Field label="Benefício" value={receipt.offer.title} />
      <Field label="Uso número" value={String(receipt.redemption_number)} />

      <Pressable
        accessibilityRole="button"
        onPress={onDone}
        style={[styles.action, { backgroundColor: colors.primary }]}>
        <Text style={[styles.actionLabel, { color: colors.primaryForeground }]}>Ler outro código</Text>
      </Pressable>
    </ScrollView>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  const colors = useColors()

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { gap: spacing.md, padding: spacing.xl },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  heading: { ...typography.title, marginBottom: spacing.sm },
  field: { gap: 2 },
  label: { ...typography.caption, textTransform: 'uppercase' },
  value: { ...typography.body, fontWeight: '600' },
  message: { ...typography.body, textAlign: 'center' },
  link: { ...typography.body, fontWeight: '700', textAlign: 'center' },
  action: {
    alignItems: 'center',
    borderRadius: radius.pill,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionLabel: { ...typography.body, fontWeight: '700' },
})
