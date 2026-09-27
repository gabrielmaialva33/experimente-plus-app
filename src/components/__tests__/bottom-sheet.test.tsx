import { act, render } from '@testing-library/react-native'
import { Dimensions, StyleSheet, Text } from 'react-native'

import { BottomSheet, SHEET_MAX_WIDTH } from '@/components/bottom-sheet'

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
