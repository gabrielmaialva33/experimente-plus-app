import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import { Pressable, Share, StyleSheet, Text, View } from 'react-native'

import type { PartnerContentItemKind } from '@/api/partner-content'
import { publicEstablishmentUrl } from '@/explorer/save-actions'
import { useSavedContent, useToggleSavedContent } from '@/explorer/queries'
import { useSession } from '@/session/context'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

const PATH = { experience: 'experiences', event: 'events' } as const

/**
 * The share message for a piece of partner content.
 *
 * There is no public page per experience or event: they are shown on their
 * establishment's page. So the link is the establishment's public address and
 * the title travels in the message — an address built for the item would be
 * one nobody can open.
 */
export function contentShareMessage(params: {
  title: string
  establishmentName: string
  citySlug: string
  establishmentSlug: string
}) {
  const url = publicEstablishmentUrl(params.citySlug, params.establishmentSlug)
  return { url, message: `${params.title} — ${params.establishmentName}\n${url}` }
}

/**
 * Favourite and share for an experience or an event — Anexo I item 10.
 *
 * Showcase items get neither: favouriting a priced product is a wishlist, which
 * the contract keeps out, and the scope asks to share experiences.
 */
export function ContentActions({
  kind,
  id,
  title,
  establishmentName,
  citySlug,
  establishmentSlug,
}: {
  kind: PartnerContentItemKind
  id: number
  title: string
  establishmentName: string
  citySlug: string
  establishmentSlug: string
}) {
  const colors = useColors()
  const router = useRouter()
  const { status } = useSession()
  const signedIn = status === 'authenticated'
  const saved = useSavedContent(signedIn)
  const toggle = useToggleSavedContent()

  if (kind === 'showcase_item') return null
  const path = PATH[kind]

  const favorited =
    saved.data?.data.some((entry) => entry.content.kind === kind && entry.content.id === id) ??
    false

  const onFavorite = () => {
    if (!signedIn) {
      router.push('/(tabs)/sign-in')
      return
    }
    toggle.mutate({ kind: path, id, save: !favorited })
  }

  const onShare = () => {
    const { url, message } = contentShareMessage({
      title,
      establishmentName,
      citySlug,
      establishmentSlug,
    })
    void Share.share({ title, message, url })
  }

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorited ? `Remover ${title} dos favoritos` : `Favoritar ${title}`}
        accessibilityState={{ selected: favorited, disabled: toggle.isPending }}
        disabled={toggle.isPending}
        onPress={onFavorite}
        testID={`content-favorite-${kind}-${id}`}
        style={[
          styles.action,
          {
            backgroundColor: favorited ? colors.primarySoft : colors.actionSecondary,
            borderColor: favorited ? colors.primary : colors.actionSecondaryBorder,
          },
        ]}>
        <Ionicons
          name={favorited ? 'heart' : 'heart-outline'}
          size={18}
          color={favorited ? colors.primary : colors.actionSecondaryForeground}
          accessible={false}
        />
        <Text
          style={[
            styles.label,
            { color: favorited ? colors.primary : colors.actionSecondaryForeground },
          ]}>
          {favorited ? 'Favoritado' : 'Favoritar'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Compartilhar ${title}`}
        onPress={onShare}
        testID={`content-share-${kind}-${id}`}
        style={[
          styles.action,
          { backgroundColor: colors.actionSecondary, borderColor: colors.actionSecondaryBorder },
        ]}>
        <Ionicons
          name="share-outline"
          size={18}
          color={colors.actionSecondaryForeground}
          accessible={false}
        />
        <Text style={[styles.label, { color: colors.actionSecondaryForeground }]}>Compartilhar</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  action: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
  },
  label: { ...typography.body, ...textWeight('600') },
})
