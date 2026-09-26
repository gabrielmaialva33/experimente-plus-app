import { useRouter } from 'expo-router'
import { Share, StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { EstablishmentDetail } from '@/catalog/types'
import { ActionMenu, type ActionMenuItem } from '@/components/action-menu'
import {
  compactTitleText,
  hiddenFromAccessibility,
  type CompactHeader,
} from '@/components/compact-header'
import { EstablishmentCover, coverImage } from '@/components/establishment-cover'
import { IconButton } from '@/components/icon-button'
import { useSavedStatus, useToggleSaved } from '@/explorer/queries'
import { publicEstablishmentUrl } from '@/explorer/save-actions'
import { reportHref } from '@/reviews/report-link'
import { useSession } from '@/session/context'
import { minTouch, radius, spacing } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

export const HERO_HEIGHT = 300

/** The compact bar's row under the status bar: a 44 control with room above and below. */
const BAR_ROW = minTouch + 2 * spacing.sm
/** The scroll distance over which the photo's controls give way to the bar. */
const HANDOVER = 48

/** The photo's height; without one, the placeholder still clears the status bar. */
export function placeHeroHeight(detail: EstablishmentDetail, insetTop: number) {
  return coverImage(detail.cover) !== null ? HERO_HEIGHT : 180 + insetTop
}

/**
 * The scroll offsets over which the compact bar arrives. It has fully arrived
 * when its lower edge meets the photo's, where the page's sheet starts to cover it.
 */
export function placeBarRange(detail: EstablishmentDetail, insetTop: number): [number, number] {
  const arrived = Math.max(
    HANDOVER,
    placeHeroHeight(detail, insetTop) - radius.sheet - (insetTop + BAR_ROW)
  )
  return [arrived - HANDOVER, arrived]
}

/** The photo that opens a place. Its controls float above it, in `PlaceChrome`. */
export function PlaceHero({ detail }: { detail: EstablishmentDetail }) {
  const insets = useSafeAreaInsets()
  return <EstablishmentCover cover={detail.cover} height={placeHeroHeight(detail, insets.top)} />
}

type Tone = 'image' | 'surface'

/**
 * The page's own chrome: back, share, favourite and "⋯" — which holds
 * "Denunciar este lugar", so reporting is one tap away without a link sitting at
 * the foot of the page (audits A32, A43).
 *
 * The controls float on the photo and stay put while it scrolls under them. As
 * it goes, they give way to a compact bar that names the place and keeps back,
 * favourite and "⋯" within reach. Both sets share one set of handlers and
 * labels; only the one on screen is reachable by touch or by a screen reader.
 */
export function PlaceChrome({
  detail,
  citySlug,
  header,
}: {
  detail: EstablishmentDetail
  citySlug: string
  header: CompactHeader
}) {
  const colors = useColors()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { status } = useSession()
  const signedIn = status === 'authenticated'
  const saved = useSavedStatus(detail.id, signedIn)
  const favorite = useToggleSaved('favorites', detail.id)
  const favorited = saved.data?.favorited === true
  const { compact } = header

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

  const menu: ActionMenuItem[] = [
    {
      label: 'Denunciar este lugar',
      icon: 'flag-outline',
      onPress: () => router.push(reportHref('establishment', detail.id, detail.name)),
      testID: `report-establishment-${detail.id}`,
    },
  ]

  const back = (tone: Tone) => (
    <IconButton
      icon="chevron-back"
      accessibilityLabel="Voltar"
      tone={tone}
      onPress={() => router.back()}
    />
  )
  const options = (tone: Tone, testID: string) => (
    <>
      <IconButton
        icon={favorited ? 'heart' : 'heart-outline'}
        accessibilityLabel={
          favorited ? `Remover ${detail.name} dos favoritos` : `Favoritar ${detail.name}`
        }
        selected={favorited}
        tone={tone}
        onPress={toggleFavorite}
        testID={`${testID}-favorite`}
      />
      <ActionMenu
        accessibilityLabel={`Mais opções de ${detail.name}`}
        title={detail.name}
        tone={tone}
        testID={`${testID}-menu`}
        items={menu}
      />
    </>
  )

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      {/* The bar paints the status bar strip too, on the same plane as the stack headers. */}
      <Animated.View
        testID="place-bar"
        pointerEvents={compact ? 'auto' : 'none'}
        {...hiddenFromAccessibility(!compact)}
        style={[
          styles.bar,
          {
            backgroundColor: colors.surfaceBase,
            borderBottomColor: colors.borderSubtle,
            paddingTop: insets.top + spacing.sm,
          },
          header.revealStyle,
        ]}
      >
        {back('surface')}
        <Animated.Text
          numberOfLines={1}
          style={[styles.title, { color: colors.foreground }, header.riseStyle]}
        >
          {detail.name}
        </Animated.Text>
        <View style={styles.group}>{options('surface', 'place-bar')}</View>
      </Animated.View>

      {/* The floating set sits where the bar's controls do, so the two trade places without moving. */}
      <Animated.View
        pointerEvents={compact ? 'none' : 'box-none'}
        {...hiddenFromAccessibility(compact)}
        style={[styles.floating, { top: insets.top + spacing.sm }, header.concealStyle]}
      >
        {back('image')}
        <View style={styles.group}>
          <IconButton
            icon="share-outline"
            accessibilityLabel="Compartilhar"
            tone="image"
            onPress={() => void share()}
          />
          {options('image', 'place')}
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  // Floats above the scrolling page, which it precedes in the tree.
  overlay: { left: 0, position: 'absolute', right: 0, top: 0, zIndex: 1 },
  bar: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  title: { ...compactTitleText, flex: 1 },
  floating: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
  },
  group: { flexDirection: 'row', gap: spacing.sm },
})
