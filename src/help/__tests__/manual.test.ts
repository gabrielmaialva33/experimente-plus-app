import * as WebBrowser from 'expo-web-browser'
import { Linking } from 'react-native'

import { apiBaseUrl } from '@/api/config'
import { MANUAL_ANCHORS, manualLabel, manualUrl, openManual, type HelpTopic } from '@/help/manual'

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }))

const browser = WebBrowser.openBrowserAsync as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  browser.mockResolvedValue({ type: 'opened' })
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
})

describe('the manual contract', () => {
  // These ids are fixed with the web manual: a change here is a change there.
  it('maps every topic to the exact anchor of the app chapter', () => {
    expect(MANUAL_ANCHORS).toEqual({
      install: 'app-instalar',
      explore: 'app-explorar',
      map: 'app-mapa',
      place: 'app-lugar',
      news: 'app-novidades',
      concierge: 'app-concierge',
      account: 'app-conta',
      favorites: 'app-favoritos',
      purchase: 'app-comprar',
      wallet: 'app-carteira',
      review: 'app-avaliar',
      validate: 'app-validar',
      troubleshooting: 'app-problemas',
    })
  })

  it('covers the thirteen anchors once each', () => {
    const anchors = Object.values(MANUAL_ANCHORS)
    expect(anchors).toHaveLength(13)
    expect(new Set(anchors).size).toBe(13)
    expect([...anchors].sort()).toEqual(
      [
        'app-instalar',
        'app-explorar',
        'app-mapa',
        'app-lugar',
        'app-novidades',
        'app-concierge',
        'app-conta',
        'app-favoritos',
        'app-comprar',
        'app-carteira',
        'app-avaliar',
        'app-validar',
        'app-problemas',
      ].sort()
    )
  })
})

describe('manualUrl', () => {
  it('is the manual on the API origin, without an anchor when there is no topic', () => {
    expect(apiBaseUrl).not.toMatch(/\/$/)
    expect(manualUrl()).toBe(`${apiBaseUrl}/manual`)
  })

  it('points each topic at its section', () => {
    expect(manualUrl('wallet')).toBe(`${apiBaseUrl}/manual#app-carteira`)
    expect(manualUrl('troubleshooting')).toBe(`${apiBaseUrl}/manual#app-problemas`)
    for (const [topic, anchor] of Object.entries(MANUAL_ANCHORS)) {
      expect(manualUrl(topic as HelpTopic)).toBe(`${apiBaseUrl}/manual#${anchor}`)
    }
  })
})

it('names a help control by where it leads, keeping its visible words', () => {
  expect(manualLabel('Como apresentar o benefício')).toBe(
    'Abrir o manual: como apresentar o benefício'
  )
  expect(manualLabel('Problemas comuns')).toBe('Abrir o manual: problemas comuns')
})

describe('openManual', () => {
  it('opens the section in the in-app browser, tinted with the brand navy', async () => {
    await openManual('validate')

    expect(browser).toHaveBeenCalledTimes(1)
    expect(browser).toHaveBeenCalledWith(
      `${apiBaseUrl}/manual#app-validar`,
      expect.objectContaining({
        toolbarColor: '#13467c',
        controlsColor: '#ffffff',
        secondaryToolbarColor: '#13467c',
      })
    )
    expect(Linking.openURL).not.toHaveBeenCalled()
  })

  it('opens the whole manual without a topic', async () => {
    await openManual()
    expect(browser).toHaveBeenCalledWith(`${apiBaseUrl}/manual`, expect.any(Object))
  })

  it('falls back to the system browser when no in-app browser can open it', async () => {
    browser.mockRejectedValue(new Error('No matching browser activity found'))

    await openManual('map')

    expect(Linking.openURL).toHaveBeenCalledWith(`${apiBaseUrl}/manual#app-mapa`)
  })

  it('settles quietly when nothing on the device can open a page', async () => {
    browser.mockRejectedValue(new Error('No matching browser activity found'))
    jest.mocked(Linking.openURL).mockRejectedValue(new Error('No activity'))

    await expect(openManual('place')).resolves.toBeUndefined()
  })

  it('opens one browser for a double tap', async () => {
    let finish = () => {}
    browser.mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve({ type: 'dismiss' })
      })
    )

    const first = openManual('wallet')
    const second = openManual('wallet')
    finish()
    await Promise.all([first, second])
    expect(browser).toHaveBeenCalledTimes(1)

    // Once it settled, the next tap opens it again.
    browser.mockResolvedValue({ type: 'opened' })
    await openManual('wallet')
    expect(browser).toHaveBeenCalledTimes(2)
  })
})
