import type Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useAnnouncement } from '@/components/announce'
import { Button } from '@/components/button'
import { IconButton } from '@/components/icon-button'
import { useSavedStatus, useToggleSaved } from '@/explorer/queries'
import { useSession } from '@/session/context'
import { spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

import { followExplained, markFollowExplained } from './follow-hint'

const FOLLOW_HINT = 'Você segue este lugar. Ele fica na sua lista Seguindo, em Conta.'

/**
 * The page's main action — "Como chegar", or the first contact when there is
 * no route — in the brand's navy (audit A11: orange is for the benefit), next
 * to following the place and adding it to an itinerary.
 *
 * Following needs saying once (audit A27): the first time a person follows a
 * place, a line tells them where it went. After that the bell is enough.
 */
export function PlaceActions({
  establishmentId,
  name,
  primary,
}: {
  establishmentId: number
  name: string
  primary?: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }
}) {
  const colors = useColors()
  const router = useRouter()
  const { status } = useSession()
  const signedIn = status === 'authenticated'
  const saved = useSavedStatus(establishmentId, signedIn)
  const follow = useToggleSaved('follows', establishmentId)
  const following = saved.data?.following === true
  const [explain, setExplain] = useState(false)
  useAnnouncement(explain && FOLLOW_HINT)

  const requireSession = (action: () => void) => () => {
    if (!signedIn) {
      router.push('/(tabs)/sign-in')
      return
    }
    action()
  }

  const toggleFollow = requireSession(() => {
    if (follow.isPending) return
    follow.mutate(!following)
    if (!following && !followExplained()) {
      markFollowExplained()
      setExplain(true)
    }
  })

  return (
    <View style={styles.block}>
      <View style={styles.row}>
        {primary ? (
          <View style={styles.primary}>
            <Button
              label={primary.label}
              icon={primary.icon}
              size={52}
              fill
              onPress={primary.onPress}
            />
          </View>
        ) : null}
        <IconButton
          icon={following ? 'notifications' : 'notifications-outline'}
          accessibilityLabel={following ? `Deixar de seguir ${name}` : `Seguir ${name}`}
          selected={following}
          onPress={toggleFollow}
          testID="place-follow"
        />
        <IconButton
          icon="trail-sign-outline"
          accessibilityLabel="Adicionar a um roteiro"
          onPress={requireSession(() => router.push(`/roteiros/adicionar/${establishmentId}`))}
          testID="place-itinerary"
        />
      </View>
      {explain ? (
        <Text style={[styles.hint, { color: colors.mutedForeground }]} testID="follow-hint">
          {FOLLOW_HINT}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  // The two icons wrap under the main action when the three no longer share a line:
  // at large text or on a narrow phone, instead of running off the page's edge.
  row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // Grows over the rest of its line, and takes a line of its own when it must.
  primary: { flexGrow: 1, flexShrink: 1 },
  hint: typography.meta,
})
