import { useRouter } from 'expo-router'
import { Share, StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { EstablishmentDetail } from '@/catalog/types'
import { ActionMenu, type ActionMenuItem } from '@/components/action-menu'
import { useAnnouncement } from '@/components/announce'
import {
  compactTitleText,
  hiddenFromAccessibility,
  type CompactHeader,
} from '@/components/compact-header'
import { EstablishmentCover, coverImage } from '@/components/establishment-cover'
import { IconButton } from '@/components/icon-button'
import { useSavedStatus, useToggleSaved } from '@/explorer/queries'
import { openManual } from '@/help/manual'
import { publicEstablishmentUrl } from '@/place/links'
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

/**
 * The scroll offset that shows a point of the page just below the compact bar.
 *
 * Every section a place page scrolls to (reviews, the item a link names) sits
 * below the photo, so the bar has arrived by the time the page gets there and
 * covers the page's top: a section brought to the very top would start under it.
 */
export function offsetBelowBar(y: number, insetTop: number) {
  return Math.max(0, y - (insetTop + BAR_ROW) - spacing.md)
}

/** The photo that opens a place. Its controls float above it, in `PlaceChrome`. */
export function PlaceHero({ detail }: { detail: EstablishmentDetail }) {
  const insets = useSafeAreaInsets()
  return (
    <EstablishmentCover
      cover={detail.cover}
      height={placeHeroHeight(detail, insets.top)}
      accessible
    />
  )
}

type Tone = 'image' | 'surface'

/**
 * The page's own chrome: back, share, favourite and "⋯" — which holds
 * "Denunciar este lugar", so reporting is one tap away without a link sitting at
 * the foot of the page (audits A32, A43), and "Ajuda", the manual's section on
 * a place's page.
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
  // The heart is rolled back when the server refuses; the person hears why.
  useAnnouncement(
    favorite.isError &&
      (favorite.variables
        ? `Não foi possível favoritar ${detail.name} agora.`
        : `Não foi possível remover ${detail.name} dos favoritos agora.`)
  )

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
    {
      label: 'Ajuda',
      accessibilityLabel: 'Ajuda: abrir o manual sobre a página do lugar',
      icon: 'help-circle-outline',
      // The promise keeps the sheet mounted until the browser settles: on iOS a browser
      // presented over a sheet that is closing would close with it.
      onPress: () => openManual('place'),
      testID: 'place-help',
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
            paddingLeft: spacing.lg + insets.left,
            paddingRight: spacing.lg + insets.right,
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
        style={[
          styles.floating,
          {
            left: spacing.lg + insets.left,
            right: spacing.lg + insets.right,
            top: insets.top + spacing.sm,
          },
          header.concealStyle,
        ]}
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
  },
  title: { ...compactTitleText, flex: 1 },
  // Clear of a side cutout in landscape, like the bar.
  floating: { flexDirection: 'row', justifyContent: 'space-between', position: 'absolute' },
  group: { flexDirection: 'row', gap: spacing.sm },
})
