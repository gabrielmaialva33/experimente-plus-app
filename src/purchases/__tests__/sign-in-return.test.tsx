import { render, waitFor } from '@testing-library/react-native'

import PurchaseSignInScreen from '@/app/compra/entrar'

jest.mock('expo-router', () => ({ useRouter: jest.fn() }))
jest.mock('@/session/context', () => ({ useSession: jest.fn() }))
jest.mock('@/session/sign-in-screen', () => () => null)

it('keeps login stacked over the chosen product and goes back only after authentication', async () => {
  const router = { back: jest.fn(), canGoBack: () => true, replace: jest.fn() }
  jest.requireMock('expo-router').useRouter.mockReturnValue(router)
  const useSession = jest.requireMock('@/session/context').useSession as jest.Mock
  useSession.mockReturnValue({ status: 'anonymous' })
  const view = await render(<PurchaseSignInScreen />)
  expect(router.back).not.toHaveBeenCalled()
  useSession.mockReturnValue({ status: 'authenticated' })
  await view.rerender(<PurchaseSignInScreen />)
  await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1))
  expect(router.replace).not.toHaveBeenCalled()
})
