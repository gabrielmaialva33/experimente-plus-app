import { useState } from 'react'
import { RefreshControl } from 'react-native'

import { isOnline, OFFLINE_MESSAGE, whenOffline } from '@/api/online'
import { announce } from '@/components/announce'
import { useColors } from '@/theme/use-colors'

/** Said when a pull cannot reach the server; what is on screen stays as it was. */
export const PULL_OFFLINE = `${OFFLINE_MESSAGE} A lista continua como estava.`

/**
 * A `RefreshControl` for a list the server fills, to pass as `refreshControl`.
 *
 * The spinner follows the pull alone, not the background refetches the cache
 * already does. A pull refetches only what the screen shows: anonymous
 * discovery is throttled per IP, so it never refreshes the whole cache.
 *
 * Offline, the query layer pauses a refetch until the connection returns, so
 * awaiting it would keep the spinner turning indefinitely. A pull without a
 * connection says so and lets go; one that loses it midway lets go too.
 */
export function usePullToRefresh(...refetches: (() => Promise<unknown>)[]) {
  const colors = useColors()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = async () => {
    if (!isOnline()) {
      announce(PULL_OFFLINE)
      return
    }
    setRefreshing(true)
    const offline = whenOffline()
    try {
      // A failed refetch shows through the query's own error state.
      const settled = Promise.allSettled(refetches.map((refetch) => refetch())).then(() => false)
      if (await Promise.race([settled, offline.promise.then(() => true)])) announce(PULL_OFFLINE)
    } finally {
      offline.cancel()
      setRefreshing(false)
    }
  }

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
      colors={[colors.primary]}
      tintColor={colors.primary}
      progressBackgroundColor={colors.surfaceRaised}
      testID="pull-to-refresh"
    />
  )
}
