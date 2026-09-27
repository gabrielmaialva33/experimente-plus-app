import { act, render } from '@testing-library/react-native'
import { Dimensions, StyleSheet, Text } from 'react-native'

import { BottomSheet, SHEET_MAX_WIDTH, navigationBarPlane } from '@/components/bottom-sheet'
import { palette } from '@/theme/tokens'

const PHONE = 411
const TABLET_LANDSCAPE = 1280

describe('BottomSheet', () => {
  const setWindowWidth = (width: number) =>
    act(() =>
      Dimensions.set({
        window: { ...Dimensions.get('window'), width },
        screen: { ...Dimensions.get('screen'), width },
      })
    )
  const initial = Dimensions.get('window').width
  afterEach(() => setWindowWidth(initial))

  const sheetStyle = async () => {
    const view = await render(
      <BottomSheet onClose={jest.fn()} closeLabel="Fechar" testID="sheet">
        <Text>Denunciar este lugar</Text>
      </BottomSheet>
    )
    return StyleSheet.flatten(view.getByTestId('sheet').props.style)
  }

  it('spans a phone', async () => {
    await setWindowWidth(PHONE)
    expect(await sheetStyle()).toMatchObject({ marginLeft: 0, width: PHONE })
  })

  it('keeps a phone-like measure, centred, on a tablet', async () => {
    await setWindowWidth(TABLET_LANDSCAPE)
    expect(await sheetStyle()).toMatchObject({
      marginLeft: (TABLET_LANDSCAPE - SHEET_MAX_WIDTH) / 2,
      width: SHEET_MAX_WIDTH,
    })
  })
})

describe('what a sheet paints behind the navigation bar', () => {
  const navy = palette.light.chrome

  it('lays the navy plane under the white three-button bar of a light sheet', () => {
    expect(navigationBarPlane(48, 'light', navy)).toBe(navy)
    expect(navigationBarPlane(48, null, navy)).toBe(navy)
  })

  it('leaves the gesture bar and a dark sheet as they are', () => {
    expect(navigationBarPlane(24, 'light', navy)).toBe('transparent')
    expect(navigationBarPlane(0, 'light', navy)).toBe('transparent')
    expect(navigationBarPlane(48, 'dark', navy)).toBe('transparent')
  })
})
