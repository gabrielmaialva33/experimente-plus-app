import { fireEvent, render } from '@testing-library/react-native'
import * as WebBrowser from 'expo-web-browser'
import { AccessibilityInfo } from 'react-native'

import { apiBaseUrl } from '@/api/config'
import { EmptyState } from '@/components/empty-state'
import { ListRow } from '@/components/list-row'
import { ScreenHeader } from '@/components/screen-header'
import { HelpButton, HelpLink, TROUBLESHOOTING_HELP } from '@/help/help-link'
import { minTouch, palette } from '@/theme/tokens'

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }))
jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')

const browser = WebBrowser.openBrowserAsync as jest.Mock
const theme = jest.requireMock('@/theme/use-colors') as { useColors: jest.Mock }

beforeEach(() => {
  jest.clearAllMocks()
  theme.useColors.mockReturnValue(palette.light)
  browser.mockResolvedValue({ type: 'opened' })
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility')
})

describe('HelpLink', () => {
  it('is a 44 link named by where it leads, keeping its words', async () => {
    const view = await render(<HelpLink topic="validate" label="Como validar" />)

    const link = view.getByRole('link', { name: 'Abrir o manual: como validar' })
    expect(link).toHaveStyle({ minHeight: minTouch })
    expect(view.getByText('Como validar')).toHaveStyle({ color: palette.light.primary })

    await fireEvent.press(link)
    expect(browser).toHaveBeenCalledWith(`${apiBaseUrl}/manual#app-validar`, expect.any(Object))
    // The browser coming up is the answer; nothing is said over it.
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled()
  })

  it('opens the whole manual without a topic', async () => {
    const view = await render(<HelpLink label="Como usar o app" />)
    await fireEvent.press(view.getByRole('link', { name: 'Abrir o manual: como usar o app' }))
    expect(browser).toHaveBeenCalledWith(`${apiBaseUrl}/manual`, expect.any(Object))
  })
})

describe('HelpButton', () => {
  it('is a 44 circle that says what it opens', async () => {
    const view = await render(<HelpButton topic="map" label="Como usar o mapa" tone="image" />)
    const button = view.getByRole('link', { name: 'Abrir o manual: como usar o mapa' })
    expect(button).toHaveStyle({ width: minTouch, height: minTouch })

    await fireEvent.press(button)
    expect(browser).toHaveBeenCalledWith(`${apiBaseUrl}/manual#app-mapa`, expect.any(Object))
  })

  it('shares the title line of a header band', async () => {
    const view = await render(
      <ScreenHeader
        title="Carteira"
        subtitle="Seus benefícios"
        action={<HelpButton topic="wallet" label="Como apresentar o benefício" tone="chrome" />}
      />
    )
    expect(view.getByRole('header', { name: 'Carteira' })).toBeOnTheScreen()
    expect(
      view.getByRole('link', { name: 'Abrir o manual: como apresentar o benefício' })
    ).toHaveStyle({ backgroundColor: palette.light.chromeRaised })
  })
})

describe('EmptyState help', () => {
  it('adds the troubleshooting link under a failure card’s one action', async () => {
    const retry = jest.fn()
    const view = await render(
      <EmptyState
        icon="cloud-offline-outline"
        title="Não foi possível carregar"
        action={{ label: 'Tentar de novo', onPress: retry }}
        help={TROUBLESHOOTING_HELP}
      />
    )
    expect(view.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen()
    await fireEvent.press(view.getByRole('link', { name: 'Abrir o manual: problemas comuns' }))
    expect(browser).toHaveBeenCalledWith(`${apiBaseUrl}/manual#app-problemas`, expect.any(Object))
    expect(retry).not.toHaveBeenCalled()
  })

  it('stays out of a card that asks for none', async () => {
    const view = await render(<EmptyState icon="heart-outline" title="Nenhum favorito ainda" />)
    expect(view.queryByRole('link')).toBeNull()
  })
})

it('draws a row that leaves the app as a link with the open glyph', async () => {
  const open = jest.fn()
  const view = await render(
    <ListRow icon="help-circle-outline" label="Ajuda e manual" external onPress={open} />
  )
  await fireEvent.press(view.getByRole('link', { name: 'Ajuda e manual' }))
  expect(open).toHaveBeenCalled()
  expect(view.getByTestId('list-row-external')).toBeOnTheScreen()
  expect(view.queryByTestId('list-row-chevron')).toBeNull()
})
