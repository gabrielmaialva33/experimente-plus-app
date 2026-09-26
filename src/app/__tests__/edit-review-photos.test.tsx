import { fireEvent, render } from '@testing-library/react-native'

import EditReviewScreen from '@/app/avaliar/editar/[id]'

jest.mock('@/api/client', () => ({ ApiError: class ApiError extends Error {} }))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('expo-image', () => ({ Image: 'Image' }))
jest.mock('@/api/config', () => ({ resolveMediaUrl: (url: string) => url }))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => ({ id: '1' }),
}))
jest.mock('@/components/image-picker', () => {
  const { Pressable, Text } = jest.requireActual('react-native')
  return {
    ImagePicker: ({ onChange, maxImages }: any) => (
      <Pressable
        testID="photo-picker"
        accessibilityLabel={`restam ${maxImages}`}
        onPress={() =>
          onChange([{ uri: 'file:///novo.jpg', fileName: 'novo.jpg', mimeType: 'image/jpeg', width: 8, height: 6 }])
        }>
        <Text>picker</Text>
      </Pressable>
    ),
  }
})
jest.mock('@/reviews/queries', () => ({
  useMyReviews: jest.fn(),
  useUpdateReview: jest.fn(),
  useAuthorRules: jest.fn(),
  useAddReviewPhoto: jest.fn(),
  useRemoveReviewPhoto: jest.fn(),
}))

const queries = jest.requireMock('@/reviews/queries') as Record<string, jest.Mock>
const idle = (overrides = {}) => ({ mutate: jest.fn(), isPending: false, isError: false, error: null, ...overrides })

const photo = (id: number) => ({ id, url: `/uploads/${id}.jpg`, width: 8, height: 6, alt_text: null })
const withPhotos = (photos: ReturnType<typeof photo>[]) => ({
  isPending: false,
  data: {
    data: [
      {
        id: 1,
        rating: 4,
        comment: 'Bom.',
        status: 'published',
        photos_count: photos.length,
        videos_count: 0,
        created_at: '2026-09-20T12:00:00Z',
        photos,
      },
    ],
  },
})

beforeEach(() => {
  jest.clearAllMocks()
  queries.useUpdateReview.mockReturnValue(idle())
  queries.useAddReviewPhoto.mockReturnValue(idle())
  queries.useRemoveReviewPhoto.mockReturnValue(idle())
  queries.useAuthorRules.mockReturnValue({ data: { max_photos: 3 } })
})

it('removes a photo as soon as it is asked, not on save', async () => {
  const mutate = jest.fn()
  queries.useRemoveReviewPhoto.mockReturnValue(idle({ mutate }))
  queries.useMyReviews.mockReturnValue(withPhotos([photo(10), photo(11)]))

  const view = await render(<EditReviewScreen />)
  expect(view.getByTestId('keyboard-form')).toBeOnTheScreen()
  await fireEvent.press(view.getByTestId('remove-photo-11'))

  expect(mutate).toHaveBeenCalledWith(11)
})

it('offers only the photos still allowed, and uploads each as it is chosen', async () => {
  const mutate = jest.fn()
  queries.useAddReviewPhoto.mockReturnValue(idle({ mutate }))
  queries.useMyReviews.mockReturnValue(withPhotos([photo(10), photo(11)]))

  const view = await render(<EditReviewScreen />)
  expect(view.getByLabelText('restam 1')).toBeTruthy()
  await fireEvent.press(view.getByTestId('photo-picker'))

  expect(mutate).toHaveBeenCalledWith({ uri: 'file:///novo.jpg', fileName: 'novo.jpg', mimeType: 'image/jpeg' })
})

it('offers no picker once the review holds as many photos as the operation allows', async () => {
  queries.useMyReviews.mockReturnValue(withPhotos([photo(10), photo(11), photo(12)]))

  const view = await render(<EditReviewScreen />)

  expect(view.queryByTestId('photo-picker')).toBeNull()
  expect(view.getByTestId('remove-photo-12')).toBeTruthy()
})
