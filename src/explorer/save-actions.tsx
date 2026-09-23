import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { Pressable, Share, StyleSheet, Text, View } from 'react-native'

import { apiUrl } from '@/api/config'
import { useSession } from '@/session/context'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

import { useSavedStatus, useToggleSaved } from './queries'

interface SaveActionsProps {
  establishmentId: number
  name: string
  citySlug: string
  slug: string
}

/**
 * The public address of an establishment, as someone else would open it.
 *
 * Built from the city and establishment slugs because that pair is the public
 * identity (ADR-0016 §6) and the only one that resolves from a URL — sharing
 * the numeric id would hand out an address nobody can open.
 */
export const publicEstablishmentUrl = (citySlug: string, slug: string) =>
  apiUrl(`/cidades/${encodeURIComponent(citySlug)}/estabelecimentos/${encodeURIComponent(slug)}`)

/**
 * Favourite, follow, add to an itinerary and share — Anexo I item 10.
 *
 * Sharing needs no session and creates nothing on the server: it hands the
 * public link to the operating system's own share sheet, which is what the
 * scope asks for ("pelos mecanismos suportados pelo aplicativo e pelo sistema
 * operacional"). The other three belong to a person, so a visitor is taken to
 * sign in instead of being shown a toggle that would only fail.
 */
export function SaveActions({ establishmentId, name, citySlug, slug }: SaveActionsProps) {
  const colors = useColors()
  const router = useRouter()
  const { status } = useSession()
  const signedIn = status === 'authenticated'

  const saved = useSavedStatus(establishmentId, signedIn)
  const favorite = useToggleSaved('favorites', establishmentId)
  const follow = useToggleSaved('follows', establishmentId)

  const favorited = saved.data?.favorited === true
  const following = saved.data?.following === true

  const requireSession = (action: () => void) => () => {
    if (!signedIn) {
      router.push('/(tabs)/sign-in')
      return
    }
    action()
  }

  const share = () => {
    const url = publicEstablishmentUrl(citySlug, slug)
    void Share.share({ title: name, message: `${name}\n${url}`, url })
  }

  const actions = [
    {
      key: 'favorite',
      label: favorited ? 'Favoritado' : 'Favoritar',
      icon: favorited ? 'heart' : 'heart-outline',
      pressed: favorited,
      busy: favorite.isPending,
      onPress: requireSession(() => favorite.mutate(!favorited)),
    },
    {
      key: 'follow',
      label: following ? 'Seguindo' : 'Seguir',
      icon: following ? 'notifications' : 'notifications-outline',
      pressed: following,
      busy: follow.isPending,
      onPress: requireSession(() => follow.mutate(!following)),
    },
    {
      key: 'itinerary',
      label: 'Roteiro',
      icon: 'map-outline',
      pressed: undefined,
      busy: false,
      onPress: requireSession(() => router.push(`/roteiros/adicionar/${establishmentId}`)),
    },
    {
      key: 'share',
      label: 'Compartilhar',
      icon: 'share-outline',
      pressed: undefined,
      busy: false,
      onPress: share,
    },
  ] as const

  return (
    <View style={styles.row} testID="save-actions">
      {actions.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          // A toggle announces its state; a plain action has none to announce.
          accessibilityState={
            action.pressed === undefined
              ? { disabled: action.busy }
              : { selected: action.pressed, disabled: action.busy }
          }
          disabled={action.busy}
          onPress={action.onPress}
          testID={`save-action-${action.key}`}
          style={[
            styles.action,
            {
              backgroundColor: action.pressed ? colors.primarySoft : colors.actionSecondary,
              borderColor: action.pressed ? colors.primary : colors.actionSecondaryBorder,
            },
          ]}>
          <Ionicons
            name={action.icon}
            size={20}
            color={action.pressed ? colors.primary : colors.actionSecondaryForeground}
            accessible={false}
          />
          <Text
            style={[
              styles.label,
              { color: action.pressed ? colors.primary : colors.actionSecondaryForeground },
            ]}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  label: { ...typography.body, fontWeight: '600' },
})
