import { act, render } from '@testing-library/react-native'
import { AppState, Text } from 'react-native'

import { RemoteImage } from '@/components/remote-image'

const mockMounts = { count: 0 }
const mockErrors: (() => void)[] = []
jest.mock('expo-image', () => {
  const { useEffect } = jest.requireActual('react')
  const { View } = jest.requireActual('react-native')
  return {
    Image: ({ onError, source }: { onError?: (event: unknown) => void; source: { uri: string } }) => {
      useEffect(() => {
        mockMounts.count += 1
      }, [])
      mockErrors.push(() => onError?.({ error: 'failed' }))
      return <View testID={`image-${source.uri}`} />
    },
  }
})

let emit: (status: string) => void = () => {}
// The test renderer mocks AppState.currentState as a function; the app reads a string.
const setAppState = (status: string) =>
  Object.defineProperty(AppState, 'currentState', { value: status, configurable: true, writable: true })

beforeEach(() => {
  mockMounts.count = 0
  mockErrors.length = 0
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    emit = handler as (status: string) => void
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>
  })
})

afterEach(() => jest.restoreAllMocks())

it('mounts again an image that rendered while the app was in the background', async () => {
  setAppState('background')
  await render(<RemoteImage source={{ uri: 'https://cdn.test/a.png' }} />)
  expect(mockMounts.count).toBe(1)

  setAppState('active')
  await act(async () => emit('active'))

  expect(mockMounts.count).toBe(2)
})

it('leaves alone an image that only ever rendered in the foreground', async () => {
  setAppState('active')
  await render(<RemoteImage source={{ uri: 'https://cdn.test/a.png' }} />)
  await act(async () => emit('background'))
  await act(async () => emit('active'))

  expect(mockMounts.count).toBe(1)
})

it('gives way to its fallback when the image fails, and tries again for another address', async () => {
  setAppState('active')
  const view = await render(
    <RemoteImage source={{ uri: 'https://cdn.test/a.png' }} fallback={<Text>Foto indisponível</Text>} />
  )
  await act(async () => mockErrors[mockErrors.length - 1]())
  expect(view.getByText('Foto indisponível')).toBeOnTheScreen()
  expect(view.queryByTestId('image-https://cdn.test/a.png')).toBeNull()

  await view.rerender(
    <RemoteImage source={{ uri: 'https://cdn.test/b.png' }} fallback={<Text>Foto indisponível</Text>} />
  )
  expect(view.getByTestId('image-https://cdn.test/b.png')).toBeOnTheScreen()
})
