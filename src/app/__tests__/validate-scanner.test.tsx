import { act, fireEvent, render } from '@testing-library/react-native'
import { AccessibilityInfo, Linking } from 'react-native'

import ValidateScreen from '@/app/(tabs)/validate'

const TOKEN = `${'a'.repeat(20)}.${'b'.repeat(43)}`
const REJECTED = 'Este código não é uma apresentação válida. Peça um novo ao cliente.'

const mockRouter = { push: jest.fn() }
type Effect = () => void | (() => void)
const mockFocus: { effect?: Effect; cleanup?: () => void } = {}
const mockCamera: {
  props?: {
    onBarcodeScanned?: (result: { data: string }) => void
    onMountError?: (event: { message: string }) => void
  }
  mounted: boolean
  mounts: number
} = { mounted: false, mounts: 0 }

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('@/session/context', () => ({
  usePartnerAreas: () => ({ canValidate: true, canReadHistory: true }),
}))
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }))
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react')
  return {
    useRouter: () => mockRouter,
    // Focus as the navigator gives it: the effect runs on focus, its cleanup on blur.
    useFocusEffect: (effect: Effect) => {
      useEffect(() => {
        mockFocus.effect = effect
        mockFocus.cleanup = effect() || undefined
        return () => mockFocus.cleanup?.()
      }, [effect])
    },
  }
})
jest.mock('expo-camera', () => {
  const { useEffect } = jest.requireActual('react')
  return {
    useCameraPermissions: () => [{ granted: true, canAskAgain: true }, jest.fn(), jest.fn()],
    CameraView: (props: NonNullable<typeof mockCamera.props>) => {
      mockCamera.props = props
      useEffect(() => {
        mockCamera.mounted = true
        mockCamera.mounts += 1
        return () => {
          mockCamera.mounted = false
        }
      }, [])
      return null
    },
  }
})

const scan = (data: string) => act(() => mockCamera.props?.onBarcodeScanned?.({ data }))
const blur = () =>
  act(() => {
    mockFocus.cleanup?.()
    mockFocus.cleanup = undefined
  })
const focus = () =>
  act(() => {
    mockFocus.cleanup = mockFocus.effect?.() || undefined
  })

beforeEach(() => {
  jest.clearAllMocks()
  mockCamera.props = undefined
  mockCamera.mounted = false
  mockCamera.mounts = 0
})

it('opens the preview once for a code, however many frames repeat it', async () => {
  await render(<ValidateScreen />)
  expect(mockCamera.mounted).toBe(true)
  const url = `https://experimente.test/portal/redemptions/validate?token=${TOKEN}`
  await scan(url)
  await scan(url)
  await scan(url)
  expect(mockRouter.push).toHaveBeenCalledTimes(1)
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/validar/confirmar',
    params: { token: TOKEN },
  })
})

// Arbitrary content read by the camera is never opened, followed or passed on.
it('refuses what is not a presentation without opening it', async () => {
  const openURL = jest.spyOn(Linking, 'openURL')
  const view = await render(<ValidateScreen />)
  for (const data of [
    `javascript://x/?token=${TOKEN}`,
    'https://phishing.test/login',
    'WIFI:S:net;T:WPA;P:secret;;',
  ]) {
    await scan(data)
  }
  expect(view.getByText(REJECTED)).toBeOnTheScreen()
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(REJECTED)
  expect(mockRouter.push).not.toHaveBeenCalled()
  expect(openURL).not.toHaveBeenCalled()

  // A valid code after a refused one still goes through.
  await scan(TOKEN)
  expect(mockRouter.push).toHaveBeenCalledTimes(1)
})

// A camera left running behind a pushed screen keeps scanning and costs battery.
it('stops the camera when the screen loses focus and re-arms it on return', async () => {
  await render(<ValidateScreen />)
  await scan(TOKEN)
  expect(mockRouter.push).toHaveBeenCalledTimes(1)

  await blur()
  expect(mockCamera.mounted).toBe(false)

  await focus()
  expect(mockCamera.mounted).toBe(true)
  await scan(TOKEN)
  expect(mockRouter.push).toHaveBeenCalledTimes(2)
})

it('says the camera could not start and mounts it again on request', async () => {
  const view = await render(<ValidateScreen />)
  expect(mockCamera.mounts).toBe(1)
  await act(() => mockCamera.props?.onMountError?.({ message: 'Camera in use' }))
  const message =
    'Não foi possível abrir a câmera. Feche outros aplicativos que a estejam usando e tente de novo.'
  expect(view.getByText(message)).toBeOnTheScreen()
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(message)
  expect(mockCamera.mounted).toBe(false)

  await fireEvent.press(view.getByRole('button', { name: 'Tentar de novo' }))
  expect(mockCamera.mounted).toBe(true)
  expect(mockCamera.mounts).toBe(2)
  expect(view.queryByText(message)).toBeNull()
})
