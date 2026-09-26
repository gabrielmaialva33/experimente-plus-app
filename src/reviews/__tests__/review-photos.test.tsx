import { fireEvent, render } from '@testing-library/react-native'

import type { Review } from '@/api/reviews'
import { uploadReviewPhoto } from '@/api/reviews'
import { ReviewCard } from '@/reviews/review-card'
import { ReviewPhotos } from '@/reviews/review-photos'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-image', () => ({ Image: 'Image' }))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('@/api/config', () => ({
  resolveMediaUrl: (url: string) => (url.startsWith('http') ? url : `https://experimente.test${url}`),
}))
jest.mock('@/api/client', () => ({ request: jest.fn(async () => ({ id: 9 })) }))
// A Blob, like the real File, so the runtime's FormData accepts it with a filename.
jest.mock('expo-file-system', () => ({
  File: class MockFile extends Blob {
    readonly uri: string
    constructor(mockUri: string) {
      super([])
      this.uri = mockUri
    }
  },
}))

const client = jest.requireMock('@/api/client') as { request: jest.Mock }

const photo = (id: number, altText: string | null = null) => ({
  id,
  url: `/uploads/media/1/2/reviews/3/${id}.jpg`,
  width: 800,
  height: 600,
  alt_text: altText,
})

const review = (overrides: Partial<Review> = {}): Review => ({
  id: 1,
  tenant_id: 1,
  establishment_id: 7,
  user_id: 42,
  rating: 4,
  comment: 'Café muito bom.',
  status: 'published',
  photos_count: 2,
  videos_count: 0,
  created_at: '2026-09-01T12:00:00.000Z',
  updated_at: '2026-09-01T12:00:00.000Z',
  author: { id: 42, full_name: 'Ana Ribeiro', username: 'ana' },
  photos: [photo(1, 'Prato do dia'), photo(2)],
  ...overrides,
})

beforeEach(() => client.request.mockClear())

it('shows the photos of a review, each with a description a screen reader can read', async () => {
  const view = await render(<ReviewCard review={review()} />)

  expect(view.getByLabelText('Prato do dia')).toBeTruthy()
  // Never an empty label, which a screen reader would skip as if nothing were there.
  expect(view.getByLabelText('Foto 2 da avaliação')).toBeTruthy()
  expect(view.getByLabelText('Prato do dia').props.source).toEqual({
    uri: 'https://experimente.test/uploads/media/1/2/reviews/3/1.jpg',
  })
})

it('shows nothing for a review without photos', async () => {
  const view = await render(<ReviewCard review={review({ photos: [], photos_count: 0 })} />)
  expect(view.queryByTestId('review-photo-1')).toBeNull()
})

it('offers removal only where the caller may remove, and says which photo', async () => {
  const onRemove = jest.fn()
  const view = await render(<ReviewPhotos photos={[photo(1, 'Prato do dia')]} onRemove={onRemove} />)

  await fireEvent.press(view.getByLabelText('Remover Prato do dia'))
  expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))

  const readOnly = await render(<ReviewPhotos photos={[photo(1)]} />)
  expect(readOnly.queryByTestId('remove-photo-1')).toBeNull()
})

it('sends a photo as a file part, under the field the server reads', async () => {
  // expo/fetch replaces the global fetch and sends only Blob parts; React
  // Native's { uri, name, type } object throws on the device before any request.
  const append = jest.spyOn(FormData.prototype, 'append')
  await uploadReviewPhoto(
    5,
    { uri: 'file:///prato.jpg', fileName: 'prato.jpg', mimeType: 'image/jpeg' },
    '  Prato  '
  )

  const [path, options] = client.request.mock.calls[0]
  expect(path).toBe('/api/v1/me/reviews/5/photos')
  expect(options).toMatchObject({ method: 'POST', authenticated: true })
  expect(options.body).toBeInstanceOf(FormData)
  const [, part, filename] = append.mock.calls.find(([field]) => field === 'photo')!
  expect(part).toBeInstanceOf(jest.requireMock('expo-file-system').File)
  expect(part).toMatchObject({ uri: 'file:///prato.jpg' })
  expect(filename).toBe('prato.jpg')
  expect(append).toHaveBeenCalledWith('alt_text', 'Prato')
  append.mockRestore()
})
