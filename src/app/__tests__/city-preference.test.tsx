import { fireEvent, render } from '@testing-library/react-native'

import CityScreen from '@/app/conta/cidade'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  Stack: { Screen: () => null },
}))
jest.mock('@/catalog/city-store', () => ({
  useSelectedCity: () => null,
  selectCity: jest.fn(),
}))
jest.mock('@/catalog/queries', () => ({ useCities: jest.fn() }))

const queries = jest.requireMock('@/catalog/queries') as { useCities: jest.Mock }

it('says when no city is published instead of an empty choice', async () => {
  const refetch = jest.fn()
  queries.useCities.mockReturnValue({ isPending: false, isError: false, data: [], refetch })

  const view = await render(<CityScreen />)

  expect(view.getByRole('header', { name: 'Nenhuma cidade publicada ainda' })).toBeOnTheScreen()
  expect(view.queryByRole('radiogroup')).toBeNull()
  await fireEvent.press(view.getByRole('button', { name: 'Tentar de novo' }))
  expect(refetch).toHaveBeenCalledTimes(1)
})

it('keeps the cities it has when a refetch fails', async () => {
  queries.useCities.mockReturnValue({
    isPending: false,
    isError: true,
    data: [{ slug: 'londrina', name: 'Londrina', state_code: 'PR' }],
    refetch: jest.fn(),
  })

  const view = await render(<CityScreen />)

  expect(view.getByRole('radio', { name: 'Londrina, PR' })).toBeOnTheScreen()
  expect(view.queryByText('Não foi possível carregar as cidades')).toBeNull()
})
