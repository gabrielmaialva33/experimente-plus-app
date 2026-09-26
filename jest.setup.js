// Safe-area insets without a native provider: the library's own mock returns zero
// insets unless a test renders a provider. A test that mocks the module itself wins.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default
)
