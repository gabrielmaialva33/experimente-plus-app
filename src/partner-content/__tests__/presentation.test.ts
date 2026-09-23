import type { PartnerContentPublicItem } from '@/api/partner-content'

import { publishedContentView } from '../presentation'

const item = (overrides: Partial<PartnerContentPublicItem> = {}): PartnerContentPublicItem => ({
  id: 7,
  kind: 'experience',
  title: 'Versão aprovada',
  description: 'Texto público',
  starts_at: null,
  ends_at: null,
  informational_price_cents: null,
  published_at: '2026-09-18T12:00:00.000Z',
  media: [],
  ...overrides,
})

describe('publishedContentView', () => {
  it('reads the derived public payload without any publication rule of its own', () => {
    expect(publishedContentView(item())).toEqual({
      id: 7,
      kind: 'experience',
      title: 'Versão aprovada',
      description: 'Texto público',
      startsAt: null,
      endsAt: null,
      informationalPriceCents: null,
      publishedAt: '2026-09-18T12:00:00.000Z',
      media: [],
    })
  })

  it('ignores a snapshot or a live column that a stale payload still carries', () => {
    // The server derives the public version. If a deployment regresses and ships
    // the moderation columns again, the client must stay on the public fields
    // instead of resurrecting the snapshot-versus-live choice.
    const stale = {
      ...item({ title: 'Título público', description: 'Descrição pública' }),
      status: 'pending_review',
      published_snapshot: { title: 'Título antigo', description: 'Descrição antiga' },
      tenant_id: 1,
      establishment_id: 10,
      created_by: 3,
    } as PartnerContentPublicItem

    const view = publishedContentView(stale)

    expect(view?.title).toBe('Título público')
    expect(view?.description).toBe('Descrição pública')
    expect(JSON.stringify(view)).not.toMatch(/antig|snapshot|pending_review/)
  })

  it('renders an item that carries no snapshot field at all', () => {
    const view = publishedContentView(item({ title: 'Somente campos públicos' }))

    expect(view?.title).toBe('Somente campos públicos')
  })

  it('refuses only an item with no title to show', () => {
    expect(publishedContentView(item({ title: '   ' }))).toBeNull()
  })

  it('reads the event window and the showcase price from the public fields', () => {
    const event = publishedContentView(
      item({
        kind: 'event',
        title: 'Noite especial',
        starts_at: '2026-09-20T22:00:00.000Z',
        ends_at: '2026-09-21T01:00:00.000Z',
      })
    )
    expect(event).toMatchObject({
      kind: 'event',
      startsAt: '2026-09-20T22:00:00.000Z',
      endsAt: '2026-09-21T01:00:00.000Z',
      informationalPriceCents: null,
    })

    const showcase = publishedContentView(
      item({ kind: 'showcase_item', title: 'Menu degustação', informational_price_cents: 12990 })
    )
    expect(showcase).toMatchObject({
      kind: 'showcase_item',
      informationalPriceCents: 12990,
      startsAt: null,
      endsAt: null,
    })
  })

  it('keeps approved media and drops an entry without a usable image or alt text', () => {
    const asset = {
      id: 80,
      media_type: 'image' as const,
      file_extension: 'jpg' as const,
      mime_type: 'image/jpeg' as const,
      width: 1200,
      height: 800,
      url: '/uploads/experience.jpg',
    }

    const view = publishedContentView(
      item({
        media: [
          {
            id: 90,
            is_cover: true,
            sort_order: 0,
            alt_text: 'Mesa preparada para degustação',
            caption: 'Experiência da casa',
            asset,
          },
          {
            id: 91,
            is_cover: false,
            sort_order: 1,
            alt_text: '   ',
            caption: null,
            asset: { ...asset, id: 81, url: '/uploads/sem-alt.jpg' },
          },
        ],
      })
    )

    expect(view?.media).toEqual([
      {
        id: 90,
        isCover: true,
        altText: 'Mesa preparada para degustação',
        caption: 'Experiência da casa',
        url: '/uploads/experience.jpg',
      },
    ])
  })
})
