import { LIST_CLIPPING } from '@/components/list-clipping'

// Every FlatList spreads these props; the lint rule in eslint.config.js
// refuses one that doesn't.
describe('list clipping', () => {
  it('turns off the Android clipping that crashed beta 4', () => {
    expect(LIST_CLIPPING).toEqual({ removeClippedSubviews: false })
  })
})
