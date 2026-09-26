import { useRouter } from 'expo-router'
import { Share, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { EstablishmentDetail } from '@/catalog/types'
import { ActionMenu } from '@/components/action-menu'
import { EstablishmentCover, coverImage } from '@/components/establishment-cover'
import { IconButton } from '@/components/icon-button'
import { useSavedStatus, useToggleSaved } from '@/explorer/queries'
import { publicEstablishmentUrl } from '@/explorer/save-actions'
import { reportHref } from '@/reviews/report-link'
import { useSession } from '@/session/context'
import { spacing } from '@/theme/tokens'

export const HERO_HEIGHT = 300

/**
 * The photo that opens a place, with the page's own chrome on it: back, share,
 * favourite and "⋯" — which holds "Denunciar este lugar", so reporting is one
 * tap away without a link sitting at the foot of the page (audits A32, A43).
 */
export function PlaceHero({ detail, citySlug }: { detail: EstablishmentDetail; citySlug: string }) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { status } = useSession()
  const signedIn = status === 'authenticated'
  const saved = useSavedStatus(detail.id, signedIn)
  const favorite = useToggleSaved('favorites', detail.id)
  const favorited = saved.data?.favorited === true
  const hasPhoto = coverImage(detail.cover) !== null

  const share = () => {
    const url = publicEstablishmentUrl(citySlug, detail.slug)
    return Share.share({ title: detail.name, message: `${detail.name}\n${url}`, url })
  }

  const toggleFavorite = () => {
    if (!signedIn) {
      router.push('/(tabs)/sign-in')
      return
    }
    if (!favorite.isPending) favorite.mutate(!favorited)
  }

  return (
    <View>
      <EstablishmentCover cover={detail.cover} height={hasPhoto ? HERO_HEIGHT : 180 + insets.top} />
      <View style={[styles.bar, { top: insets.top + spacing.sm }]}>
        <IconButton icon="chevron-back" accessibilityLabel="Voltar" tone="image" onPress={() => router.back()} />
        <View style={styles.group}>
          <IconButton icon="share-outline" accessibilityLabel="Compartilhar" tone="image" onPress={() => void share()} />
          <IconButton
            icon={favorited ? 'heart' : 'heart-outline'}
            accessibilityLabel={favorited ? `Remover ${detail.name} dos favoritos` : `Favoritar ${detail.name}`}
            selected={favorited}
            tone="image"
            onPress={toggleFavorite}
            testID="place-favorite"
          />
          <ActionMenu
            accessibilityLabel={`Mais opções de ${detail.name}`}
            title={detail.name}
            tone="image"
            testID="place-menu"
            items={[
              {
                label: 'Denunciar este lugar',
                icon: 'flag-outline',
                onPress: () => router.push(reportHref('establishment', detail.id, detail.name)),
                testID: `report-establishment-${detail.id}`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-between', left: spacing.lg, position: 'absolute', right: spacing.lg },
  group: { flexDirection: 'row', gap: spacing.sm },
})
