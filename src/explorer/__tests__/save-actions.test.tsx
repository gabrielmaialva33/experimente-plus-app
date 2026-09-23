import { fireEvent, render } from '@testing-library/react-native'
import { Share } from 'react-native'

import { publicEstablishmentUrl, SaveActions } from '@/explorer/save-actions'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('@/api/config', () => ({
  apiUrl: (path: string) => `https://experimente.test${path}`,
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/session/context', () => ({ useSession: jest.fn() }))
jest.mock('@/explorer/queries', () => ({
  useSavedStatus: jest.fn(),
  useToggleSaved: jest.fn(),
}))

const session = jest.requireMock('@/session/context') as { useSession: jest.Mock }
const queries = jest.requireMock('@/explorer/queries') as {
  useSavedStatus: jest.Mock
  useToggleSaved: jest.Mock
}

const toggles = { favorites: jest.fn(), follows: jest.fn() }

const renderActions = () =>
  render(
    <SaveActions establishmentId={7} name="Ateliê do Café" citySlug="londrina" slug="atelie-do-cafe" />
  )

beforeEach(() => {
  mockPush.mockReset()
  toggles.favorites.mockReset()
  toggles.follows.mockReset()
  session.useSession.mockReturnValue({ status: 'authenticated' })
  queries.useSavedStatus.mockReturnValue({ data: { favorited: false, following: true } })
  queries.useToggleSaved.mockImplementation((kind: 'favorites' | 'follows') => ({
    mutate: toggles[kind],
    isPending: false,
  }))
})

it('builds the shared link from the city and establishment slugs', () => {
  expect(publicEstablishmentUrl('londrina', 'atelie-do-cafe')).toBe(
    'https://experimente.test/cidades/londrina/estabelecimentos/atelie-do-cafe'
  )
  expect(publicEstablishmentUrl('são paulo', 'a/b')).toBe(
    'https://experimente.test/cidades/s%C3%A3o%20paulo/estabelecimentos/a%2Fb'
  )
})

it('toggles each relation to the opposite of what the server said', async () => {
  const view = await renderActions()

  await fireEvent.press(view.getByTestId('save-action-favorite'))
  await fireEvent.press(view.getByTestId('save-action-follow'))

  expect(toggles.favorites).toHaveBeenCalledWith(true)
  expect(toggles.follows).toHaveBeenCalledWith(false)
})

it('announces the state of each toggle to assistive technology', async () => {
  const view = await renderActions()

  expect(view.getByTestId('save-action-favorite').props.accessibilityState).toMatchObject({
    selected: false,
  })
  expect(view.getByTestId('save-action-follow').props.accessibilityState).toMatchObject({
    selected: true,
  })
  expect(view.getByText('Seguindo')).toBeTruthy()
})

it('takes a visitor to sign in instead of toggling something that would fail', async () => {
  session.useSession.mockReturnValue({ status: 'anonymous' })
  queries.useSavedStatus.mockReturnValue({ data: undefined })
  const view = await renderActions()

  await fireEvent.press(view.getByTestId('save-action-favorite'))
  await fireEvent.press(view.getByTestId('save-action-itinerary'))

  expect(toggles.favorites).not.toHaveBeenCalled()
  expect(mockPush).toHaveBeenCalledWith('/(tabs)/sign-in')
  expect(mockPush).not.toHaveBeenCalledWith('/roteiros/adicionar/7')
})

it('lets a visitor share, since sharing belongs to nobody', async () => {
  session.useSession.mockReturnValue({ status: 'anonymous' })
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' })
  const view = await renderActions()

  await fireEvent.press(view.getByTestId('save-action-share'))

  expect(share).toHaveBeenCalledWith(
    expect.objectContaining({
      url: 'https://experimente.test/cidades/londrina/estabelecimentos/atelie-do-cafe',
    })
  )
  expect(mockPush).not.toHaveBeenCalled()
})

it('opens the itinerary picker for a signed-in explorer', async () => {
  const view = await renderActions()

  await fireEvent.press(view.getByTestId('save-action-itinerary'))

  expect(mockPush).toHaveBeenCalledWith('/roteiros/adicionar/7')
})
