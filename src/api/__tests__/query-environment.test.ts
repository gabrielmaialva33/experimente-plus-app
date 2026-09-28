import { focusManager, onlineManager } from '@tanstack/react-query'
import { AppState, type AppStateStatus } from 'react-native'

import { installQueryEnvironment } from '../query-client'

jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn(),
  getNetworkStateAsync: jest.fn(),
}))
jest.mock('expo-secure-store', () => ({}))
jest.mock('react-native-mmkv', () => ({ createMMKV: () => ({}) }))

type NetworkState = { isConnected: boolean }

const Network = jest.requireMock('expo-network') as {
  addNetworkStateListener: jest.Mock
  getNetworkStateAsync: jest.Mock
}

/** One pending first reading and the listener expo-network was given. */
const network = () => {
  const remove = jest.fn()
  let emit!: (state: NetworkState) => void
  let resolveFirst!: (state: NetworkState) => void
  Network.addNetworkStateListener.mockImplementation((listener) => {
    emit = listener
    return { remove }
  })
  Network.getNetworkStateAsync.mockReturnValue(
    new Promise<NetworkState>((resolve) => {
      resolveFirst = resolve
    })
  )
  return { remove, emit: (state: NetworkState) => emit(state), resolveFirst }
}

const appState = () => {
  const remove = jest.fn()
  let change!: (status: AppStateStatus) => void
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    change = listener as (status: AppStateStatus) => void
    return { remove } as unknown as ReturnType<typeof AppState.addEventListener>
  })
  return { remove, change: (status: AppStateStatus) => change(status) }
}

const flush = () => new Promise<void>((resolve) => setImmediate(() => resolve()))

afterEach(() => {
  // The managers are singletons: leave them as a fresh app would find them.
  onlineManager.setEventListener(() => undefined)
  onlineManager.setOnline(true)
  focusManager.setFocused(undefined)
  jest.restoreAllMocks()
})

it('follows the connection, and a late first reading does not undo a newer event', async () => {
  const net = network()
  appState()
  installQueryEnvironment()

  net.emit({ isConnected: false })
  expect(onlineManager.isOnline()).toBe(false)

  net.resolveFirst({ isConnected: true })
  await flush()
  expect(onlineManager.isOnline()).toBe(false)

  net.emit({ isConnected: true })
  expect(onlineManager.isOnline()).toBe(true)
})

it('starts from the first reading while no event has arrived', async () => {
  const net = network()
  appState()
  installQueryEnvironment()

  net.resolveFirst({ isConnected: false })
  await flush()
  expect(onlineManager.isOnline()).toBe(false)
})

it('ignores a first reading that arrives after the listener was torn down', async () => {
  const net = network()
  appState()
  installQueryEnvironment()

  // A second install (Fast Refresh, a remounted root) replaces the first listener.
  const next = network()
  installQueryEnvironment()
  expect(net.remove).toHaveBeenCalledTimes(1)

  net.resolveFirst({ isConnected: false })
  await flush()
  expect(onlineManager.isOnline()).toBe(true)
  expect(next.remove).not.toHaveBeenCalled()
})

it('focuses queries while the app is active and removes its listeners on cleanup', async () => {
  const net = network()
  const app = appState()
  const cleanup = installQueryEnvironment()

  app.change('background')
  expect(focusManager.isFocused()).toBe(false)
  app.change('active')
  expect(focusManager.isFocused()).toBe(true)

  cleanup()
  expect(app.remove).toHaveBeenCalledTimes(1)

  // The network listener belongs to onlineManager, which drops it with its last subscriber.
  const unsubscribe = onlineManager.subscribe(() => {})
  unsubscribe()
  expect(net.remove).toHaveBeenCalledTimes(1)
})
