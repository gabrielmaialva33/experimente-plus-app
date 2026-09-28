import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'

import WalletHistoryScreen from '@/app/carteira/historico'
import PartnerReceiptScreen from '@/app/validar/comprovante/[code]'
import PartnerHistoryScreen from '@/app/validar/historico'

const mockRouter = {
  push: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
}
const mockSession = { status: 'loading', refresh: jest.fn(async () => {}) }
const mockAreas = { canValidate: false, canReadHistory: false }

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ code: 'EXP-1' }),
}))
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('@/api/client', () => ({ ApiError: jest.requireActual('@/api/transport').ApiError }))
jest.mock('@/session/context', () => ({
  useSession: () => mockSession,
  usePartnerAreas: () => mockAreas,
}))
jest.mock('@/api/redemptions', () => ({
  listPartnerRedemptions: jest.fn(async () => ({ redemptions: [], total: 0 })),
  getPartnerReceipt: jest.fn(),
}))
jest.mock('@/api/wallet', () => ({
  listMyRedemptions: jest.fn(async () => ({ redemptions: [], total: 0 })),
}))

const partner = jest.requireMock('@/api/redemptions') as {
  listPartnerRedemptions: jest.Mock
  getPartnerReceipt: jest.Mock
}
const wallet = jest.requireMock('@/api/wallet') as { listMyRedemptions: jest.Mock }

function page(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.status = 'loading'
  mockAreas.canValidate = false
  mockAreas.canReadHistory = false
})

// ADR-0022: nothing of a partner area mounts before the server said the actor has it.
it('mounts neither the partner history nor its request while the session is read', async () => {
  const view = await page(<PartnerHistoryScreen />)
  expect(view.getByRole('progressbar', { name: 'Carregando histórico' })).toBeOnTheScreen()
  expect(partner.listPartnerRedemptions).not.toHaveBeenCalled()
})

it('refuses the history to a partner without partner.redemptions.read, even one who validates', async () => {
  mockSession.status = 'authenticated'
  mockAreas.canValidate = true
  const view = await page(<PartnerHistoryScreen />)
  expect(
    view.getByText('Sua conta não tem permissão para consultar as utilizações.')
  ).toBeOnTheScreen()
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
    'Sua conta não tem permissão para consultar as utilizações.'
  )
  expect(partner.listPartnerRedemptions).not.toHaveBeenCalled()
  await fireEvent.press(view.getByRole('button', { name: 'Voltar' }))
  expect(mockRouter.back).toHaveBeenCalled()
})

it('refuses a partner receipt without the history capability, before any request', async () => {
  mockSession.status = 'authenticated'
  const view = await page(<PartnerReceiptScreen />)
  expect(
    view.getByText('Sua conta não tem permissão para consultar as utilizações.')
  ).toBeOnTheScreen()
  expect(partner.getPartnerReceipt).not.toHaveBeenCalled()
})

it('opens the partner history once the capability is granted', async () => {
  mockSession.status = 'authenticated'
  mockAreas.canReadHistory = true
  const view = await page(<PartnerHistoryScreen />)
  expect(await view.findByText('Nenhuma utilização registrada ainda')).toBeOnTheScreen()
  expect(partner.listPartnerRedemptions).toHaveBeenCalledTimes(1)
})

it('sends a visitor who opened the uses by a link to sign in, without asking for them', async () => {
  mockSession.status = 'anonymous'
  const view = await page(<WalletHistoryScreen />)
  await fireEvent.press(view.getByRole('button', { name: 'Entrar' }))
  expect(mockRouter.navigate).toHaveBeenCalledWith('/(tabs)/sign-in')
  expect(wallet.listMyRedemptions).not.toHaveBeenCalled()
})

it('offers to try again when the session could not be confirmed', async () => {
  mockSession.status = 'unavailable'
  const view = await page(<WalletHistoryScreen />)
  await fireEvent.press(view.getByRole('button', { name: 'Tentar de novo' }))
  expect(mockSession.refresh).toHaveBeenCalled()
  expect(wallet.listMyRedemptions).not.toHaveBeenCalled()
})

// Any 403 sends the context back to `loading`. A screen already open stays
// mounted through the reload: remounting would repeat the refused request after
// every reload, in a loop.
it('keeps an open screen mounted while the session revalidates, without asking again', async () => {
  mockSession.status = 'authenticated'
  mockAreas.canReadHistory = true
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const tree = () => (
    <QueryClientProvider client={client}>
      <PartnerHistoryScreen />
    </QueryClientProvider>
  )
  const view = await render(tree())
  expect(await view.findByText('Nenhuma utilização registrada ainda')).toBeOnTheScreen()

  mockSession.status = 'loading'
  await view.rerender(tree())
  expect(view.getByText('Nenhuma utilização registrada ainda')).toBeOnTheScreen()
  // A reload that failed for want of a connection is not a change of person either.
  mockSession.status = 'unavailable'
  await view.rerender(tree())
  expect(view.getByText('Nenhuma utilização registrada ainda')).toBeOnTheScreen()
  mockSession.status = 'authenticated'
  await view.rerender(tree())
  expect(view.getByText('Nenhuma utilização registrada ainda')).toBeOnTheScreen()
  expect(partner.listPartnerRedemptions).toHaveBeenCalledTimes(1)

  // A decision closes it, and the next reading waits again before opening it.
  mockSession.status = 'anonymous'
  await view.rerender(tree())
  expect(view.queryByText('Nenhuma utilização registrada ainda')).toBeNull()
  mockSession.status = 'loading'
  await view.rerender(tree())
  expect(view.getByRole('progressbar', { name: 'Carregando histórico' })).toBeOnTheScreen()
})
