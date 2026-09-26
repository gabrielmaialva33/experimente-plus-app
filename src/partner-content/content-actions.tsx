import { useRouter } from 'expo-router'
import { Share, StyleSheet, View } from 'react-native'

import type { PartnerContentItemKind } from '@/api/partner-content'
import { ActionMenu } from '@/components/action-menu'
import { IconButton } from '@/components/icon-button'
import { publicEstablishmentUrl } from '@/explorer/save-actions'
import { useSavedContent, useToggleSavedContent } from '@/explorer/queries'
import { reportHref } from '@/reviews/report-link'
import { useSession } from '@/session/context'
import { spacing } from '@/theme/tokens'

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

interface ContentActionProps {
  kind: PartnerContentItemKind
  id: number
  title: string
  establishmentName: string
  citySlug: string
  establishmentSlug: string
  /** `image` when the action sits on a photo. */
  tone?: 'surface' | 'image'
}

/** The public link of an item, handed to the system's share sheet. */
export function shareContent({ title, establishmentName, citySlug, establishmentSlug }: ContentActionProps) {
  const { url, message } = contentShareMessage({ title, establishmentName, citySlug, establishmentSlug })
  return Share.share({ title, message, url })
}

/**
 * Favourite for an experience or an event — Anexo I item 10. A heart that
 * stays in sight on the card (audit A32); a visitor is taken to sign in.
 *
 * Showcase items get none: favouriting a priced product is a wishlist, which
 * the contract keeps out.
 */
export function ContentFavorite({
  kind,
  id,
  title,
  tone = 'surface',
  testID,
}: Pick<ContentActionProps, 'kind' | 'id' | 'title' | 'tone'> & { testID?: string }) {
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
    if (!toggle.isPending) toggle.mutate({ kind: path, id, save: !favorited })
  }

  return (
    <IconButton
      icon={favorited ? 'heart' : 'heart-outline'}
      accessibilityLabel={favorited ? `Remover ${title} dos favoritos` : `Favoritar ${title}`}
      selected={favorited}
      tone={tone}
      onPress={onFavorite}
      testID={testID ?? `content-favorite-${kind}-${id}`}
    />
  )
}

/**
 * The item's "⋯" (audit A32): share — experiences and events, since the scope
 * asks to share experiences — and report, which every item has. One menu per
 * item instead of a row of buttons and a "Denunciar" under every card.
 */
export function ContentMenu(props: ContentActionProps) {
  const router = useRouter()
  const { kind, id, title, tone = 'surface' } = props

  return (
    <ActionMenu
      accessibilityLabel={`Mais opções: ${title}`}
      title={title}
      tone={tone}
      testID={`content-menu-${kind}-${id}`}
      items={[
        ...(kind === 'showcase_item'
          ? []
          : [{
              label: 'Compartilhar',
              icon: 'share-outline' as const,
              onPress: () => shareContent(props),
              testID: `content-share-${kind}-${id}`,
            }]),
        {
          label: 'Denunciar',
          icon: 'flag-outline' as const,
          onPress: () => router.push(reportHref(kind, id, title)),
          testID: `report-${kind}-${id}`,
        },
      ]}
    />
  )
}

/** Heart and "⋯" together, as a card shows them. */
export function ContentActions(props: ContentActionProps) {
  return (
    <View style={styles.row}>
      <ContentFavorite {...props} />
      <ContentMenu {...props} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
})
