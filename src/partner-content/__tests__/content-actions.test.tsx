import { fireEvent, render } from '@testing-library/react-native'
import { Share } from 'react-native'

import { ContentActions, contentShareMessage } from '@/partner-content/content-actions'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('@/api/config', () => ({ apiUrl: (path: string) => `https://experimente.test${path}` }))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('@/session/context', () => ({ useSession: jest.fn() }))
jest.mock('@/explorer/queries', () => ({
  useSavedContent: jest.fn(),
  useToggleSavedContent: jest.fn(),
}))

const session = jest.requireMock('@/session/context') as { useSession: jest.Mock }
const queries = jest.requireMock('@/explorer/queries') as Record<string, jest.Mock>
const mutate = jest.fn()

const renderActions = (kind: 'experience' | 'event' | 'showcase_item' = 'experience') =>
  render(
    <ContentActions
      kind={kind}
      id={31}
      title="Degustação guiada"
      establishmentName="Ateliê do Café"
      citySlug="londrina"
      establishmentSlug="atelie-do-cafe"
    />
  )

beforeEach(() => {
  jest.clearAllMocks()
  session.useSession.mockReturnValue({ status: 'authenticated' })
  queries.useSavedContent.mockReturnValue({ data: { data: [], unavailable: 0 } })
  queries.useToggleSavedContent.mockReturnValue({ mutate, isPending: false })
})

it('shares the establishment page, since the item has no page of its own', () => {
  expect(
    contentShareMessage({
      title: 'Degustação guiada',
      establishmentName: 'Ateliê do Café',
      citySlug: 'londrina',
      establishmentSlug: 'atelie-do-cafe',
    })
  ).toEqual({
    url: 'https://experimente.test/cidades/londrina/estabelecimentos/atelie-do-cafe',
    message:
      'Degustação guiada — Ateliê do Café\nhttps://experimente.test/cidades/londrina/estabelecimentos/atelie-do-cafe',
  })
})

it('favourites an experience under its route kind', async () => {
  const view = await renderActions('experience')

  await fireEvent.press(view.getByTestId('content-favorite-experience-31'))

  expect(mutate).toHaveBeenCalledWith({ kind: 'experiences', id: 31, save: true })
})

it('reads the saved state per species, so the same number is another item', async () => {
  queries.useSavedContent.mockReturnValue({
    data: {
      data: [{ id: 1, content: { kind: 'event', id: 31 }, created_at: '' }],
      unavailable: 0,
    },
  })

  const view = await renderActions('event')

  // The heart is an icon now; its state is announced, not written out.
  expect(view.getByTestId('content-favorite-event-31').props.accessibilityState).toEqual({ selected: true })
  expect(view.getByRole('button', { name: 'Remover Degustação guiada dos favoritos' })).toBeTruthy()
  await fireEvent.press(view.getByTestId('content-favorite-event-31'))
  expect(mutate).toHaveBeenCalledWith({ kind: 'events', id: 31, save: false })
})

it('takes a visitor to sign in to favourite, but lets them share', async () => {
  session.useSession.mockReturnValue({ status: 'anonymous' })
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' })
  const view = await renderActions()

  await fireEvent.press(view.getByTestId('content-favorite-experience-31'))
  expect(mutate).not.toHaveBeenCalled()
  expect(mockPush).toHaveBeenCalledWith('/(tabs)/sign-in')

  // Sharing sits in the item's "⋯" (audit A32).
  await fireEvent.press(view.getByRole('button', { name: 'Mais opções: Degustação guiada' }))
  await fireEvent.press(view.getByTestId('content-share-experience-31'))
  expect(share).toHaveBeenCalledWith(
    expect.objectContaining({
      url: 'https://experimente.test/cidades/londrina/estabelecimentos/atelie-do-cafe',
    })
  )
})

it('offers neither favourite nor share on a showcase item, only a report', async () => {
  const view = await renderActions('showcase_item')
  expect(view.queryByTestId('content-favorite-showcase_item-31')).toBeNull()
  await fireEvent.press(view.getByRole('button', { name: 'Mais opções: Degustação guiada' }))
  expect(view.queryByTestId('content-share-showcase_item-31')).toBeNull()
  await fireEvent.press(view.getByTestId('report-showcase_item-31'))
  expect(mockPush).toHaveBeenCalledWith('/denunciar/showcase_item/31?nome=Degusta%C3%A7%C3%A3o%20guiada')
})

it('keeps one menu per item, holding both share and report (audit A32)', async () => {
  const view = await renderActions('event')
  expect(view.getAllByRole('button', { name: /Mais opções/ })).toHaveLength(1)
  expect(view.queryByText('Denunciar')).toBeNull()
  expect(view.getByTestId('content-favorite-event-31')).toBeOnTheScreen()

  await fireEvent.press(view.getByRole('button', { name: 'Mais opções: Degustação guiada' }))
  expect(view.getByText('Compartilhar')).toBeOnTheScreen()
  await fireEvent.press(view.getByText('Denunciar'))
  expect(mockPush).toHaveBeenCalledWith('/denunciar/event/31?nome=Degusta%C3%A7%C3%A3o%20guiada')
})
