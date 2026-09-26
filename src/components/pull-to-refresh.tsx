import { useState } from 'react'
import { RefreshControl } from 'react-native'

import { useColors } from '@/theme/use-colors'

/**
 * A `RefreshControl` for a list the server fills, to pass as `refreshControl`.
 *
 * The spinner follows the pull alone, not the background refetches the cache
 * already does. A pull refetches only what the screen shows: anonymous
 * discovery is throttled per IP, so it never refreshes the whole cache.
 */
export function usePullToRefresh(...refetches: (() => Promise<unknown>)[]) {
  const colors = useColors()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      // A failed refetch shows through the query's own error state.
      await Promise.allSettled(refetches.map((refetch) => refetch()))
    } finally {
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
