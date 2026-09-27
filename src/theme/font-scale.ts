import { useWindowDimensions } from 'react-native'

/**
 * A line cap that holds at the text size direction A was drawn for and lifts
 * once the person asks the system for larger text.
 *
 * Cards keep an even rhythm by cutting a long name at one or two lines. At
 * 200% text the same cut leaves "Café da Pr…", which is information lost, not
 * a tidy card: then the text wraps and the card grows.
 */
export function useLineCap(lines: number): number | undefined {
  const { fontScale } = useWindowDimensions()
  return fontScale > 1 ? undefined : lines
}

/**
 * The system text size from which side-by-side blocks stack: Android's "Large"
 * step, 1.3, which arrives as the float 1.2999999523…, hence the margin below it.
 */
export const STACK_FROM_SCALE = 1.25

/**
 * Whether two blocks drawn side by side should stack: a ticket's terms and its
 * price, two date tiles, a total and the button that pays it.
 *
 * A fixed column holds at the drawn size. With larger text it breaks words and
 * amounts where no break belongs ("R$ 14,/90", "Ver of/erta", "09/12/20/26"),
 * so from this size each block takes the full width instead.
 */
export function useStackedLayout(): boolean {
  const { fontScale } = useWindowDimensions()
  return fontScale >= STACK_FROM_SCALE
}

/**
 * A fixed width that grows with the system text, up to `max` times: a card of a
 * horizontal row stays one size across the row, yet a word of its title still
 * fits a line at 200% ("demonstração" instead of "demo/nstração").
 */
export function useScaledWidth(width: number, max = 1.6): number {
  const { fontScale } = useWindowDimensions()
  return scaledWidth(width, fontScale, max)
}

/** `useScaledWidth` for a given text size: never narrower than drawn, at most `max` times. */
export function scaledWidth(width: number, fontScale: number, max = 1.6): number {
  return Math.round(width * Math.min(Math.max(fontScale, 1), max))
}
