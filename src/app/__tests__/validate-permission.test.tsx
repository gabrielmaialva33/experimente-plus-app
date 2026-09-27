import { fireEvent, render } from '@testing-library/react-native'
import { AppState, Linking } from 'react-native'

import ValidateScreen from '@/app/(tabs)/validate'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('@/session/context', () => ({
  usePartnerAreas: () => ({ canValidate: true, canReadHistory: true }),
}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: jest.fn(),
}))
const mockCamera = {
  permission: { granted: false, canAskAgain: true },
  request: jest.fn(),
  get: jest.fn(),
}
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [mockCamera.permission, mockCamera.request, mockCamera.get],
}))

beforeEach(() => {
  mockCamera.request.mockReset()
  mockCamera.get.mockReset()
})

it('asks for the camera while the system can still ask', async () => {
  mockCamera.permission = { granted: false, canAskAgain: true }
  const view = await render(<ValidateScreen />)

  await fireEvent.press(view.getByRole('button', { name: 'Permitir câmera' }))
  expect(mockCamera.request).toHaveBeenCalled()
  expect(view.queryByRole('button', { name: 'Abrir configurações' })).toBeNull()
})

// Refused for good, the system no longer shows its dialog: "Permitir câmera"
// would do nothing, so the screen leads to the app's page in the settings.
it('leads to the system settings once the camera is blocked, and reads it again on return', async () => {
  mockCamera.permission = { granted: false, canAskAgain: false }
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue()
  let onChange: ((state: string) => void) | undefined
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
    onChange = handler as (state: string) => void
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>
  })

  const view = await render(<ValidateScreen />)
  expect(view.getByText(/A câmera está bloqueada para o Experimente\+/)).toBeOnTheScreen()
  expect(view.queryByRole('button', { name: 'Permitir câmera' })).toBeNull()

  await fireEvent.press(view.getByRole('button', { name: 'Abrir configurações' }))
  expect(openSettings).toHaveBeenCalled()

  onChange?.('active')
  expect(mockCamera.get).toHaveBeenCalled()
})
