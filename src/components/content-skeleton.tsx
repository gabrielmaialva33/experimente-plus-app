import { StyleSheet, View } from 'react-native'

import { OFFLINE_MESSAGE, OFFLINE_WAITING, useOnline } from '@/api/online'
import { useAnnouncement } from '@/components/announce'
import { EmptyState } from '@/components/empty-state'
import { radius, spacing } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * Fixed placeholders: no animation, private data, or speculative actions.
 *
 * Offline, a first load does not fail: the query layer pauses it until the
 * connection returns. Bones that never fill would read as a hang, so the
 * placeholder says what it is waiting for instead; the content replaces it by
 * itself when the fetch resumes.
 */
export function ContentSkeleton({
  label,
  variant = 'list',
}: {
  label: string
  variant?: 'list' | 'catalog' | 'detail' | 'presentation'
}) {
  const colors = useColors()
  const online = useOnline()
  useAnnouncement(!online && `${OFFLINE_MESSAGE} ${OFFLINE_WAITING}`)
  const repeated = variant === 'list' || variant === 'catalog'
  const bone = { backgroundColor: colors.border, borderRadius: radius.sm }

  if (!online) {
    return (
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <EmptyState
          testID="content-offline"
          icon="cloud-offline-outline"
          title={OFFLINE_MESSAGE.replace(/\.$/, '')}
          text={OFFLINE_WAITING}
        />
      </View>
    )
  }

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={[styles.page, { backgroundColor: colors.background }]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.content}
      >
        {Array.from({ length: repeated ? 3 : 1 }, (_, index) => (
          <View key={index} style={[styles.card, { backgroundColor: colors.surfaceRaised }]}>
            {variant === 'catalog' ? <View style={[bone, styles.cover]} /> : null}
            <View style={styles.lines}>
              <View testID="skeleton-title" style={[bone, styles.title]} />
              <View style={[bone, styles.subtitle]} />
              {variant === 'presentation' ? (
                <View testID="skeleton-qr-slot" style={[bone, styles.qr]} />
              ) : null}
              {Array.from({ length: variant === 'detail' ? 6 : 2 }, (_, line) => (
                <View key={line} style={[bone, styles.line]} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: spacing.lg, overflow: 'hidden' },
  content: { gap: spacing.md },
  card: { borderRadius: radius.surface, overflow: 'hidden' },
  cover: { height: 160, width: '100%' },
  lines: { gap: spacing.md, padding: spacing.lg },
  title: { height: 24, width: '70%' },
  subtitle: { height: 16, width: '45%' },
  line: { height: 16, width: '100%' },
  qr: {
    alignSelf: 'center',
    width: 240,
    maxWidth: '100%',
    aspectRatio: 1,
    marginVertical: spacing.lg,
  },
})
