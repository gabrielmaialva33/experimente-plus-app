import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text } from 'react-native'

import type { ReportTargetType } from '@/api/reviews'
import { useSession } from '@/session/context'
import { spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * A quiet way into the report flow — Anexo I item 10, "denunciar conteúdos ou
 * estabelecimentos".
 *
 * A report needs a session, so a visitor is taken to sign in instead of being
 * handed a form whose only possible answer is 401.
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
  const { status } = useSession()

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() =>
        router.push(status === 'authenticated' ? `/denunciar/${type}/${id}` : '/(tabs)/sign-in')
      }
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
