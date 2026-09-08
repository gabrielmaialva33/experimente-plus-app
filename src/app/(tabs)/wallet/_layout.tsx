import { Stack } from 'expo-router'

import { stackSurfaceOptions } from '@/theme/navigation'
import { useColors } from '@/theme/use-colors'

export default function WalletLayout() {
  const colors = useColors()
  return (
    <Stack screenOptions={stackSurfaceOptions(colors)}>
      <Stack.Screen name="index" options={{ title: 'Carteira' }} />
      <Stack.Screen name="edicoes" options={{ title: 'Edições e pedidos' }} />
      <Stack.Screen name="edicao/[id]" options={{ title: 'Comprar edição' }} />
      <Stack.Screen name="pedido/[id]" options={{ title: 'Meu pedido' }} />
    </Stack>
  )
}
