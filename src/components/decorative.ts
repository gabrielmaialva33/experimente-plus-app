/**
 * Spread on an icon or a drawing that only repeats what the words beside it
 * say. A screen reader then skips it instead of stopping on an unlabelled
 * glyph — an Ionicons icon is a character from a private font, which has no
 * name to read.
 *
 * Not needed inside a pressable with a label: that already speaks as one
 * element, and what is drawn in it is never reached on its own.
 */
export const decorative = {
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const
