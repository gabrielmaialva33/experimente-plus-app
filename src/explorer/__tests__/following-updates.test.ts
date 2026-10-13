import type { FollowingUpdate } from '@/api/explorer'
import { followingUpdateView, loadedUpdates } from '@/explorer/following-updates'

const update = (
  kind: FollowingUpdate['kind'],
  id: number,
  overrides: Partial<FollowingUpdate> = {}
): FollowingUpdate => ({
  kind,
  id,
  title: `Item ${id}`,
  description: null,
  published_at: '2026-10-10T12:00:00.000Z',
  starts_at: null,
  ends_at: null,
  informational_price_cents: null,
  cover: null,
  establishment: {
    id: 9,
    slug: 'atelie-do-cafe',
    name: 'Ateliê do Café',
    city_slug: 'londrina',
    city_name: 'Londrina',
    cover_url: null,
    category: 'Cafés',
  },
  ...overrides,
})

describe('followingUpdateView', () => {
  it('opens the place’s page at the item, since an item has no page of its own', () => {
    expect(followingUpdateView(update('experience', 31)).href).toBe(
      '/estabelecimento/londrina/atelie-do-cafe?destaque=experience-31'
    )
  })

  it('says when an event happens and when anything else was published', () => {
    const event = followingUpdateView(
      update('event', 32, {
        starts_at: '2026-10-20T22:00:00.000Z',
        ends_at: '2026-10-21T01:00:00.000Z',
      })
    )
    expect(event.kindLabel).toBe('Evento')
    expect(event.when).toMatch(/^\d{2} de out\.?, \d{2}:\d{2}–\d{2}:\d{2}$/)
    expect(followingUpdateView(update('experience', 31)).when).toMatch(/^Publicado em /)
  })

  it('shows a showcase price as information, and no price for anything else', () => {
    const item = followingUpdateView(
      update('showcase_item', 33, { informational_price_cents: 2500 })
    )
    expect(item.kindLabel).toBe('Vitrine')
    expect(item.price).toMatch(/^R\$\s25,00$/)
    expect(
      followingUpdateView(update('experience', 31, { informational_price_cents: 2500 })).price
    ).toBeNull()
  })

  it('keeps the approved cover with its description', () => {
    expect(
      followingUpdateView(update('experience', 31, { cover: { url: '/a.png', alt_text: 'Mesa' } }))
        .cover
    ).toEqual({ url: '/a.png', alt: 'Mesa' })
  })
})

describe('loadedUpdates', () => {
  it('joins the pages in order and keeps an item that moved between pages once', () => {
    const pages = [
      { data: [update('experience', 1), update('event', 2)] },
      { data: [update('event', 2), update('showcase_item', 3)] },
    ]
    expect(loadedUpdates(pages).map((item) => `${item.kind}-${item.id}`)).toEqual([
      'experience-1',
      'event-2',
      'showcase_item-3',
    ])
    expect(loadedUpdates(undefined)).toEqual([])
  })
})
