import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react-native'
import { HistoryScreen } from '../history-screen'
import { ReceiptScreen } from '../receipt-screen'

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))

it.each(['history', 'receipt'])('keeps a stable, noninteractive skeleton until the initial %s read resolves', async (kind) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  let finish!: (data: any) => void
  const load = () => new Promise<any>((resolve) => { finish = resolve })
  const screen = kind === 'history'
    ? <HistoryScreen queryKey={['history']} load={load} emptyMessage="Nenhum uso" receiptHref={() => '/carteira/historico'} />
    : <ReceiptScreen queryKey={['receipt']} load={load} />
  const view = await render(<QueryClientProvider client={client}>{screen}</QueryClientProvider>)
  expect(view.getByRole('progressbar', { name: kind === 'history' ? 'Carregando histórico' : 'Carregando comprovante' }).props.accessibilityState).toEqual({ busy: true })
  expect(view.queryByRole('button')).toBeNull()
  await act(async () => { finish(kind === 'history' ? { redemptions: [], total: 0 } : null) })
  await view.findByText(kind === 'history' ? 'Nenhum uso' : 'Este comprovante não está disponível.')
  expect(view.queryByRole('progressbar')).toBeNull()
  await view.unmount()
  client.clear()
})
