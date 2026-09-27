import { createContext, useContext, type ReactNode } from 'react'
import { useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { spacing } from '@/theme/tokens'

/**
 * How wide content may run, in dp.
 *
 * A phone never reaches these: its column is the window less the gutters, as
 * direction A was drawn. A tablet or an unfolded phone would otherwise stretch
 * a line of text or a card across the whole window, and from 600 dp up Android
 * 16 ignores the portrait lock, so the same app also runs 1,280 dp wide in
 * landscape.
 */
export const MEASURE = {
  /** Text, forms, a place's page, the wallet and sheets: about 75 characters of body text. */
  readable: 600,
  /** Explorar's feed, which fills a wide window with a grid of place cards. */
  feed: 1200,
  /** A card laid over a map, such as a tapped place: a phone's measure however wide the map. */
  overlay: 520,
} as const

/** A column across the window: where it starts and ends, and how wide it is. */
export interface ContentFrame {
  /** From the window's left edge to the column's. */
  left: number
  /** From the column's right edge to the window's. */
  right: number
  /** The column itself. */
  width: number
  /** `left` and `right` as the padding of a container that spans the window. */
  padding: { paddingLeft: number; paddingRight: number }
}

/** Parts of the window a column must stay clear of: a camera cutout, a side navigation bar. */
export interface SideInsets {
  left: number
  right: number
}

/**
 * The column of at most `max` centred in a window `windowWidth` wide.
 *
 * Its edges never come closer to the window's than the gutter, counted from any
 * side inset: in landscape a camera cutout sits on one side, and a column that
 * only centred itself would start under it on a narrow window. Surfaces behind
 * the column (a header band, a photo, a sticky bar) still span the window.
 */
export function contentFrame(
  windowWidth: number,
  max: number,
  sides: SideInsets = { left: 0, right: 0 },
  gutter: number = spacing.gutter
): ContentFrame {
  // Whole dp on each side, the odd one on the right: the column never passes `max`.
  const spare = windowWidth - max
  const left = Math.max(gutter + sides.left, Math.floor(spare / 2))
  const right = Math.max(gutter + sides.right, Math.ceil(spare / 2))
  return {
    left,
    right,
    width: Math.max(0, windowWidth - left - right),
    padding: { paddingLeft: left, paddingRight: right },
  }
}

/** `contentFrame` for the current window and its safe area. */
export function useContentFrame(
  max: number = MEASURE.readable,
  gutter: number = spacing.gutter
): ContentFrame {
  const { width } = useWindowDimensions()
  const { left, right } = useSafeAreaInsets()
  return contentFrame(width, max, { left, right }, gutter)
}

const FrameContext = createContext<ContentFrame | null>(null)

/**
 * Hands a screen's column to the pieces drawn inside it: a header band, a row
 * of cards that scrolls past the column's edges, a section title. A screen that
 * provides none gets the readable column.
 */
export function ContentFrameProvider({
  frame,
  children,
}: {
  frame: ContentFrame
  children: ReactNode
}) {
  return <FrameContext.Provider value={frame}>{children}</FrameContext.Provider>
}

/** The column of the screen this piece is drawn in. */
export function useScreenFrame(): ContentFrame {
  const provided = useContext(FrameContext)
  const readable = useContentFrame()
  return provided ?? readable
}

/** The narrowest a place card of the feed gets before the grid drops a column. */
export const PLACE_CARD_MIN_WIDTH = 300
/** Between cards of a grid, across and down: the feed's rhythm between cards. */
export const GRID_GAP = spacing.lg

/** How many columns at least `minColumn` wide fit in `width`, with `gap` between them. */
export function gridColumns(width: number, minColumn: number, gap: number = GRID_GAP): number {
  return Math.max(1, Math.floor((width + gap) / (minColumn + gap)))
}

export interface CardGrid {
  columns: number
  /** Each card's width; the columns and their gaps fill the column they are laid in. */
  columnWidth: number
}

/**
 * Cards laid in `width`: one column on a phone, as many as fit at least
 * `PLACE_CARD_MIN_WIDTH` wide on a wider window. Larger text needs a wider card
 * for its name to wrap by words, so the minimum grows with half the text's
 * growth: 450 at 200%.
 */
export function cardGrid(width: number, fontScale: number): CardGrid {
  const minColumn = Math.round(PLACE_CARD_MIN_WIDTH * (1 + Math.max(0, fontScale - 1) / 2))
  const columns = gridColumns(width, minColumn)
  return { columns, columnWidth: Math.floor((width - GRID_GAP * (columns - 1)) / columns) }
}

/** `cardGrid` for the column of the screen this piece is drawn in. */
export function useCardGrid(): CardGrid {
  const { width } = useScreenFrame()
  const { fontScale } = useWindowDimensions()
  return cardGrid(width, fontScale)
}

export interface FeedLayout extends CardGrid {
  frame: ContentFrame
}

/**
 * Explorar's feed: one column of place cards on a phone, a grid on a wider window.
 *
 * A card keeps the proportions it was drawn with: its photo has a fixed height,
 * so a single card 1,200 dp wide would be a thin banner. Two columns on a
 * tablet in portrait are each about as wide as the card on a phone, and a
 * landscape tablet takes three; at 200% text, one and two. When only one
 * column fits, the feed keeps the readable measure of the rest of the app
 * instead of the grid's.
 */
export function feedLayout(
  windowWidth: number,
  fontScale: number,
  sides: SideInsets = { left: 0, right: 0 }
): FeedLayout {
  const wide = contentFrame(windowWidth, MEASURE.feed, sides)
  const frame =
    cardGrid(wide.width, fontScale).columns > 1
      ? wide
      : contentFrame(windowWidth, MEASURE.readable, sides)
  return { frame, ...cardGrid(frame.width, fontScale) }
}

/** `feedLayout` for the current window, text size and safe area. */
export function useFeedLayout(): FeedLayout {
  const { width, fontScale } = useWindowDimensions()
  const { left, right } = useSafeAreaInsets()
  return feedLayout(width, fontScale, { left, right })
}
