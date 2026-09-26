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
