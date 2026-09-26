import { render } from '@testing-library/react-native'
import { AccessibilityInfo, Platform } from 'react-native'

import { useAnnouncement } from '@/components/announce'

const said = AccessibilityInfo.announceForAccessibility as jest.Mock

function Status({ message, live = false }: { message: string | null; live?: boolean }) {
  useAnnouncement(message, { spokenByLiveRegion: live })
  return null
}

beforeEach(() => said.mockClear())
afterEach(() => jest.restoreAllMocks())

it('says a message once when it appears and again only when it changes', async () => {
  const view = await render(<Status message={null} />)
  expect(said).not.toHaveBeenCalled()

  await view.rerender(<Status message="Não foi possível entrar agora." />)
  await view.rerender(<Status message="Não foi possível entrar agora." />)
  expect(said).toHaveBeenCalledTimes(1)
  expect(said).toHaveBeenLastCalledWith('Não foi possível entrar agora.')

  await view.rerender(<Status message="Dados de acesso incorretos." />)
  expect(said).toHaveBeenCalledTimes(2)
  expect(said).toHaveBeenLastCalledWith('Dados de acesso incorretos.')
})

it.each([
  ['ios', 1],
  ['android', 0],
] as const)(
  'leaves a live region already on screen to Android and tells iOS (%s)',
  async (os, times) => {
    jest.replaceProperty(Platform, 'OS', os)
    await render(<Status message="Este código não é uma apresentação válida." live />)
    expect(said).toHaveBeenCalledTimes(times)
  }
)

it('says a message mounted after an action on Android too, where no live region carries it', async () => {
  jest.replaceProperty(Platform, 'OS', 'android')
  await render(<Status message="Denúncia registrada." />)
  expect(said).toHaveBeenCalledWith('Denúncia registrada.')
})
