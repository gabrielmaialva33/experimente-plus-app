import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import { StyleSheet, useWindowDimensions, type ColorValue } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { usePartnerAreas, useSession } from '@/session/context'
import { TAB_LABEL, screenHeaderOptions, tabBarHeight } from '@/theme/navigation'
import { elevation, textWeight } from '@/theme/tokens'
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
type IconName = keyof typeof Ionicons.glyphMap

/** The outline at rest and the filled glyph when selected, both checked against the icon set. */
function icon(outline: IconName, filled: IconName) {
  return function TabBarIcon({
    color,
    size,
    focused,
  }: {
    color: ColorValue
    size: number
    focused: boolean
  }) {
    return <Ionicons name={focused ? filled : outline} color={color} size={size} />
  }
}

export default function TabsLayout() {
  const colors = useColors()
  const { fontScale } = useWindowDimensions()
  const insets = useSafeAreaInsets()
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
        tabBarLabelStyle: { ...textWeight('600'), ...TAB_LABEL },
        tabBarStyle: {
          ...elevation.raised,
          height: tabBarHeight(fontScale, insets.bottom),
          backgroundColor: colors.surfaceBase,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        // Explorar draws its own header band, which also reserves the status bar.
        options={{
          title: 'Explorar',
          headerShown: false,
          tabBarIcon: icon('compass-outline', 'compass'),
        }}
      />

      <Tabs.Protected guard={authenticated}>
        <Tabs.Screen
          name="wallet"
          options={{
            title: 'Carteira',
            headerShown: false,
            tabBarIcon: icon('ticket-outline', 'ticket'),
          }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={canValidate}>
        <Tabs.Screen
          name="validate"
          options={{ title: 'Validar', tabBarIcon: icon('scan-outline', 'scan') }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={authenticated}>
        <Tabs.Screen
          name="account"
          options={{ title: 'Conta', tabBarIcon: icon('person-outline', 'person') }}
        />
      </Tabs.Protected>

      <Tabs.Protected guard={!authenticated}>
        <Tabs.Screen
          name="sign-in"
          // Like Carteira and Conta, Entrar draws its own navy band.
          options={{
            title: 'Entrar',
            headerShown: false,
            tabBarIcon: icon('log-in-outline', 'log-in'),
          }}
        />
      </Tabs.Protected>
    </Tabs>
  )
}
