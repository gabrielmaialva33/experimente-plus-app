import { fireEvent, render, within } from '@testing-library/react-native'

import { PinGroupList } from '@/maps/pin-group-list'

jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))

// Twenty places in one shopping centre: more rows than a short map has room for.
const pins = Array.from({ length: 20 }, (_, index) => ({
  slug: `loja-${index + 1}`,
  name: `Loja ${index + 1}`,
  category: 'Lojas',
  latitude: -23.31,
  longitude: -51.16,
}))
const group = { key: 'loja-1', latitude: -23.31, longitude: -51.16, pins }

it('scrolls a long spot inside a sheet capped below the map’s top', async () => {
  const onSelect = jest.fn()
  const view = await render(<PinGroupList group={group} onSelect={onSelect} onClose={jest.fn()} />)

  const rows = view.getByTestId('pin-group-rows')
  expect(rows.type).toBe('RCTScrollView')
  expect(rows.props.horizontal).toBeFalsy()
  expect(view.getByTestId('pin-group-list')).toHaveStyle({ maxHeight: '70%' })
  // The header and its "Fechar" stay outside the scroll, always in reach.
  expect(within(rows).queryByRole('button', { name: 'Fechar lista de lugares' })).toBeNull()

  await fireEvent.press(within(rows).getByRole('button', { name: 'Loja 20, Lojas' }))
  expect(onSelect).toHaveBeenCalledWith('loja-20')
})
