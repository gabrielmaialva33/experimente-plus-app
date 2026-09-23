import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text } from 'react-native'

import type { ReportTargetType } from '@/api/reviews'
import { spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * A quiet way into the report flow — Anexo I item 10, "denunciar conteúdos ou
 * estabelecimentos".
 *
 * Everyone goes to the same form. A visitor reports anonymously and a signed-in
 * person reports as themselves (ADR-0027 scenario 13); the form says which.
 */
export function ReportLink({
  type,
  id,
  label,
}: {
  type: ReportTargetType
  id: number
  label: string
}) {
  const colors = useColors()
  const router = useRouter()

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => router.push(`/denunciar/${type}/${id}`)}
      hitSlop={spacing.sm}
      style={styles.link}
      testID={`report-${type}-${id}`}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  label: { ...typography.caption, textDecorationLine: 'underline' },
})
