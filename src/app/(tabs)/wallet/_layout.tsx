import { Stack } from 'expo-router'

export default function WalletLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="edicoes" options={{ title: 'Edições e pedidos' }} />
      <Stack.Screen name="edicao/[id]" options={{ title: 'Comprar edição' }} />
      <Stack.Screen name="pedido/[id]" options={{ title: 'Meu pedido' }} />
    </Stack>
  )
}
