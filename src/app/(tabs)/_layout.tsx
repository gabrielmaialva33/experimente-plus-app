import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import { useColorScheme, type ColorValue } from 'react-native'

import { usePartnerAreas, useSession } from '@/session/context'
import { palette } from '@/theme/tokens'

/**
 * The tab set is derived from the session and from server-projected
 * capabilities (ADR-0023 §2).
 *
 *   sem sessão    Explorar · Entrar
 *   consumidor    Explorar · Carteira · Conta
 *   parceiro      Explorar · Carteira · Validar · Conta
 *
 * `Tabs.Protected` is the documented way to do this: a guarded screen is not
 * merely hidden, it is unreachable — including by deep link. The server still
 * repeats authorization on every endpoint; this only composes the interface.
 *
 * The native tab bar (`expo-router/unstable-native-tabs`) is deliberately not
 * used: it crashes the Fabric mounting layer with SIGSEGV when the set of
 * triggers changes at runtime, which is exactly what capability-driven
 * navigation does on sign-in.
 */
const icon =
  (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color as string} size={size} />
  )

export default function TabsLayout() {
  const scheme = useColorScheme()
  const colors = palette[scheme === 'dark' ? 'dark' : 'light']
  const { status } = useSession()
  const { canValidate } = usePartnerAreas()

  const authenticated = status === 'authenticated'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Explorar', tabBarIcon: icon('compass-outline') }}
      />

      <Tabs.Protected guard={authenticated}>
        <Tabs.Screen
          name="wallet"
          options={{ title: 'Carteira', tabBarIcon: icon('ticket-outline') }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={canValidate}>
        <Tabs.Screen
          name="validate"
          options={{ title: 'Validar', tabBarIcon: icon('scan-outline') }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={authenticated}>
        <Tabs.Screen
          name="account"
          options={{ title: 'Conta', tabBarIcon: icon('person-outline') }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={!authenticated}>
        <Tabs.Screen
          name="sign-in"
          options={{ title: 'Entrar', tabBarIcon: icon('log-in-outline') }}
        />
      </Tabs.Protected>
    </Tabs>
  )
}
