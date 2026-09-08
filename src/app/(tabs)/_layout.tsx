import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import { StyleSheet, type ColorValue } from 'react-native'

import { usePartnerAreas, useSession } from '@/session/context'
import { screenHeaderOptions } from '@/theme/navigation'
import { elevation } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

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
  ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? name.replace('-outline', '') as keyof typeof Ionicons.glyphMap : name} color={color as string} size={size} />
  )

export default function TabsLayout() {
  const colors = useColors()
  const { status } = useSession()
  const { canValidate } = usePartnerAreas()

  const authenticated = status === 'authenticated'

  return (
    <Tabs
      screenOptions={{
        ...screenHeaderOptions(colors),
        tabBarActiveTintColor: colors.primaryAccent,
        // Selection uses tint and a filled icon, not a background with a different mask.
        tabBarActiveBackgroundColor: colors.surfaceBase,
        tabBarInactiveBackgroundColor: colors.surfaceBase,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { ...elevation.raised, backgroundColor: colors.surfaceBase, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Explorar', tabBarIcon: icon('compass-outline') }}
      />

      <Tabs.Protected guard={authenticated}>
        <Tabs.Screen
          name="wallet"
          options={{ title: 'Carteira', headerShown: false, tabBarIcon: icon('ticket-outline') }}
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
