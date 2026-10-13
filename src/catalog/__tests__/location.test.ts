import * as Location from 'expo-location'

import { locateForNearest } from '@/catalog/location'

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}))

const location = Location as unknown as Record<string, jest.Mock>

const answer = (granted: boolean, canAskAgain = true) => ({
  granted,
  canAskAgain,
  status: granted ? 'granted' : canAskAgain ? 'undetermined' : 'denied',
})

const at = (latitude: number, longitude: number) => ({ coords: { latitude, longitude } })

beforeEach(() => {
  jest.clearAllMocks()
  location.getForegroundPermissionsAsync.mockResolvedValue(answer(false))
  location.requestForegroundPermissionsAsync.mockResolvedValue(answer(true))
  location.hasServicesEnabledAsync.mockResolvedValue(true)
  location.getLastKnownPositionAsync.mockResolvedValue(null)
  location.getCurrentPositionAsync.mockResolvedValue(at(-23.310_512_3, -51.162_849_9))
})

describe('the position for "Mais perto"', () => {
  it('asks for foreground permission once, and rounds the fix to about eleven metres', async () => {
    await expect(locateForNearest()).resolves.toEqual({
      status: 'granted',
      origin: { latitude: -23.3105, longitude: -51.1628 },
    })
    expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1)
    // Foreground only: the background permission is never asked for.
    expect(location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled()
    expect(location.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 3 })
  })

  it('does not ask again when the permission is already there, and reuses a recent fix', async () => {
    location.getForegroundPermissionsAsync.mockResolvedValue(answer(true))
    location.getLastKnownPositionAsync.mockResolvedValue(at(-23.3, -51.15))

    await expect(locateForNearest()).resolves.toEqual({
      status: 'granted',
      origin: { latitude: -23.3, longitude: -51.15 },
    })
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
    expect(location.getLastKnownPositionAsync).toHaveBeenCalledWith({ maxAge: 300_000 })
    expect(location.getCurrentPositionAsync).not.toHaveBeenCalled()
  })

  it('tells a refusal from a permission blocked for good', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue(answer(false, true))
    await expect(locateForNearest()).resolves.toEqual({ status: 'denied' })

    location.requestForegroundPermissionsAsync.mockResolvedValue(answer(false, false))
    await expect(locateForNearest()).resolves.toEqual({ status: 'blocked' })

    // Blocked already: the system would not show its dialog, so it is not asked.
    location.requestForegroundPermissionsAsync.mockClear()
    location.getForegroundPermissionsAsync.mockResolvedValue(answer(false, false))
    await expect(locateForNearest()).resolves.toEqual({ status: 'blocked' })
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
    expect(location.getCurrentPositionAsync).not.toHaveBeenCalled()
  })

  it('says when the device location is off, without waiting for a fix', async () => {
    location.hasServicesEnabledAsync.mockResolvedValue(false)

    await expect(locateForNearest()).resolves.toEqual({ status: 'off' })
    expect(location.getLastKnownPositionAsync).not.toHaveBeenCalled()
    expect(location.getCurrentPositionAsync).not.toHaveBeenCalled()
  })

  it('reports a fix that never came as unavailable', async () => {
    location.getCurrentPositionAsync.mockRejectedValue(new Error('timeout'))
    await expect(locateForNearest()).resolves.toEqual({ status: 'unavailable' })

    location.getForegroundPermissionsAsync.mockRejectedValue(new Error('native module'))
    await expect(locateForNearest()).resolves.toEqual({ status: 'unavailable' })
  })
})
