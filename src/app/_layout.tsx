import { QueryClientProvider } from '@tanstack/react-query'
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'

import { navigationColors, stackSurfaceOptions } from '@/theme/navigation'
import { useColors } from '@/theme/use-colors'

import { createQueryClient, installQueryEnvironment } from '@/api/query-client'
import { SessionProvider, useSession } from '@/session/context'

SplashScreen.preventAutoHideAsync()

const queryClient = createQueryClient()

/**
 * Holds the splash until the session context resolves.
 *
 * This is what keeps ADR-0023 §2 honest: the tab set is only ever painted once
 * the server has told us which areas the actor has, so a partner tab is never
 * shown and then withdrawn.
 */
function SplashGate() {
  const { status } = useSession()

  useEffect(() => {
    if (status !== 'loading') {
      void SplashScreen.hideAsync()
    }
  }, [status])

  return null
}

/**
 * The root navigator is always mounted.
 *
 * Deferring it — returning null while the session loads and swapping the Stack
 * in afterwards — remounts the root of the Fabric tree and crashes with
 * SIGSEGV. Expo's own guidance is the same: the root layout's content must be
 * mounted before any navigation event. The splash screen, held by SplashGate,
 * is what covers the loading state.
 */
function Shell() {
  const colorScheme = useColorScheme()
  const colors = useColors()
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme

  return (
    <ThemeProvider value={{ ...baseTheme, colors: navigationColors(colors) }}>
      <Stack screenOptions={stackSurfaceOptions(colors)}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="compra/[id]" options={{ title: 'Comprar benefício' }} />
        <Stack.Screen name="compra/entrar" options={{ title: 'Entrar' }} />
        <Stack.Screen
          name="estabelecimento/[city]/[slug]"
          options={{ title: 'Estabelecimento' }}
        />
        <Stack.Screen
          name="carteira/apresentar"
          options={{ headerShown: true, title: 'Apresentar benefício' }}
        />
        <Stack.Screen
          name="validar/confirmar"
          options={{ headerShown: true, title: 'Validar benefício' }}
        />
        <Stack.Screen
          name="carteira/historico"
          options={{ headerShown: true, title: 'Meus usos' }}
        />
        <Stack.Screen
          name="carteira/comprovante/[code]"
          options={{ headerShown: true, title: 'Comprovante' }}
        />
        <Stack.Screen
          name="validar/historico"
          options={{ headerShown: true, title: 'Utilizações' }}
        />
        <Stack.Screen
          name="validar/comprovante/[code]"
          options={{ headerShown: true, title: 'Comprovante' }}
        />
        <Stack.Screen
          name="conta/excluir"
          options={{ headerShown: true, title: 'Excluir conta' }}
        />
      </Stack>
    </ThemeProvider>
  )
}

export default function RootLayout() {
  // Registering listeners in an effect, not in a render-time initializer: a
  // discarded render would otherwise leave a listener with no cleanup.
  useEffect(() => installQueryEnvironment(), [])

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SplashGate />
        <Shell />
      </SessionProvider>
    </QueryClientProvider>
  )
}
