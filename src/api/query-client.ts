import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query'
import * as Network from 'expo-network'
import { AppState, Platform, type AppStateStatus } from 'react-native'

import { ApiError } from './client'
import { SessionExpiredError } from './session'

/**
 * React Native has no `window` focus or online events, so both managers must be
 * wired by hand or the cache never revalidates after a reconnect or a return
 * from background.
 */
export function installQueryEnvironment(): () => void {
  onlineManager.setEventListener((setOnline) => {
    let initialised = false

    const subscription = Network.addNetworkStateListener((state) => {
      initialised = true
      setOnline(!!state.isConnected)
    })

    Network.getNetworkStateAsync()
      .then((state) => {
        if (!initialised) {
          setOnline(!!state.isConnected)
        }
      })
      .catch(() => {
        // Some platforms reject this call; the listener still governs.
      })

    return subscription.remove
  })

  const onAppStateChange = (status: AppStateStatus) => {
    if (Platform.OS !== 'web') {
      focusManager.setFocused(status === 'active')
    }
  }

  const appState = AppState.addEventListener('change', onAppStateChange)
  return () => appState.remove()
}

/**
 * Encodes the retry contract from `17-aplicativo-movel-consumer-first.md`:
 * reads may be retried with backoff, but a rule error never is, and a `429`
 * must wait for `Retry-After` instead of feeding an automatic loop.
 */
const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (error instanceof SessionExpiredError) {
    return false
  }

  if (error instanceof ApiError) {
    // 403, 404 and 422 are decisions, not transient failures. 429 carries its
    // own waiting period and is surfaced to the caller instead of retried.
    if (error.status >= 400 && error.status < 500) {
      return false
    }
  }

  return failureCount < 2
}

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        // The catalog projection is served from a versioned cache upstream;
        // a short client stale window avoids refetching on every focus.
        staleTime: 60_000,
        refetchOnReconnect: true,
      },
      mutations: {
        // A mutation that consumes a presentation or a redemption is never
        // replayed automatically: the retry contract requires human intent.
        retry: false,
      },
    },
  })
