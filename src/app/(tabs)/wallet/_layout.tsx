import { Stack } from 'expo-router'

import { stackSurfaceOptions } from '@/theme/navigation'
import { useColors } from '@/theme/use-colors'

// The wallet home always sits under an order or the catalog opened from elsewhere
// (a purchase, sign-in), so their back arrow leads to the Carteira instead of nowhere.
export const unstable_settings = { initialRouteName: 'index' }

export default function WalletLayout() {
  const colors = useColors()
  return (
    <Stack screenOptions={stackSurfaceOptions(colors)}>
      {/* The wallet draws its own header band, which also reserves the status bar. */}
      <Stack.Screen name="index" options={{ title: 'Carteira', headerShown: false }} />
      <Stack.Screen name="edicoes" options={{ title: 'Pacotes, vouchers e pedidos' }} />
      <Stack.Screen name="edicao/[id]" options={{ title: 'Comprar benefício' }} />
      <Stack.Screen name="pedido/[id]" options={{ title: 'Meu pedido' }} />
    </Stack>
  )
}
