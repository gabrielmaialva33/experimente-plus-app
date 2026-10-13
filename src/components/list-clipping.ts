/**
 * Props every FlatList in the app spreads.
 *
 * On Android a FlatList clips the rows outside the viewport by default
 * (`removeClippedSubviews`), and React Native's clipping crashes with
 * "Invalid clipping state" when the children change during a scroll: a header
 * or footer that grows (the Concierge opening at the end of Explorar), a list
 * reordered by a new sort, a filter that removes rows. Beta 4 closed on a real
 * phone exactly that way. The list still virtualizes its rows (windowSize and
 * friends), so turning the clipping off costs nothing at the sizes the app
 * shows.
 */
export const LIST_CLIPPING = { removeClippedSubviews: false } as const
