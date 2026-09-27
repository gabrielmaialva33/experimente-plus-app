import { Stack, useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { useContentFrame } from '@/components/content-frame'
import { EmptyState } from '@/components/empty-state'
import { spacing } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * Where a link to no screen of the app lands: a mistyped or outdated
 * `experimenteplus://` address, or one from a newer version.
 *
 * Without it Expo Router shows its own page, in English and with a "Sitemap"
 * meant for developers. This one says what happened in the app's words and
 * leads to Explorar, which works for everyone, signed in or not.
 */
export default function NotFoundScreen() {
  const colors = useColors()
  const router = useRouter()
  const frame = useContentFrame()

  return (
    <View style={[styles.page, frame.padding, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Link não encontrado' }} />
      <EmptyState
        testID="not-found"
        icon="compass-outline"
        title="Não encontramos esta página"
        text="O link pode estar incompleto ou ser de outra versão do aplicativo."
        action={{ label: 'Ir para Explorar', onPress: () => router.replace('/') }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', padding: spacing.gutter },
})
