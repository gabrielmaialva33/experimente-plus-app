import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import * as ExpoImagePicker from 'expo-image-picker'

import { ImagePicker, type SelectedImage } from '../image-picker'

jest.mock('expo-image', () => ({
  Image: jest.requireActual('react-native').View,
}))

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  UIImagePickerPreferredAssetRepresentationMode: {
    Compatible: 'compatible',
  },
}))

describe('ImagePicker', () => {
  const mockImage1: SelectedImage = {
    uri: 'file:///photo1.jpg',
    fileName: 'photo1.jpg',
    mimeType: 'image/jpeg',
    width: 800,
    height: 600,
  }

  const mockImage2: SelectedImage = {
    uri: 'file:///photo2.png',
    fileName: 'photo2.png',
    mimeType: 'image/png',
    width: 1024,
    height: 768,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders counter respecting the maxImages parameter and displays thumbnails', async () => {
    const onChange = jest.fn()
    const view = await render(
      <ImagePicker
        images={[mockImage1]}
        onChange={onChange}
        maxImages={4}
        label="Fotos do local"
      />
    )

    expect(view.getByText('Fotos do local')).toBeTruthy()
    expect(view.getByText('1/4')).toBeTruthy()
    expect(view.getByRole('button', { name: 'Remover foto 1' })).toBeTruthy()
    expect(
      view.getByRole('button', {
        name: 'Adicionar foto. 1 de 4 adicionadas.',
      })
    ).toBeTruthy()
  })

  it('removes an image and triggers onChange with the remaining list', async () => {
    const onChange = jest.fn()
    const view = await render(
      <ImagePicker
        images={[mockImage1, mockImage2]}
        onChange={onChange}
        maxImages={4}
      />
    )

    expect(view.getByText('2/4')).toBeTruthy()
    fireEvent.press(view.getByRole('button', { name: 'Remover foto 1' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith([mockImage2])
  })

  it('hides add button when image count reaches maxImages', async () => {
    const onChange = jest.fn()
    const view = await render(
      <ImagePicker
        images={[mockImage1, mockImage2]}
        onChange={onChange}
        maxImages={2}
      />
    )

    expect(view.getByText('2/2')).toBeTruthy()
    expect(view.queryByText('Adicionar')).toBeNull()
  })

  it('calls launchImageLibraryAsync with compatible representation mode and remaining slots limit', async () => {
    const onChange = jest.fn()
    const launchMock = jest.spyOn(ExpoImagePicker, 'launchImageLibraryAsync')
    launchMock.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///new-photo.jpg',
          fileName: 'new-photo.jpg',
          mimeType: 'image/jpeg',
          width: 1200,
          height: 900,
        },
      ],
    })

    const view = await render(
      <ImagePicker
        images={[mockImage1]}
        onChange={onChange}
        maxImages={3}
      />
    )

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: /Adicionar foto/ }))
    })

    await waitFor(() => {
      expect(launchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: 2, // 3 - 1 = 2
          preferredAssetRepresentationMode: 'compatible',
        })
      )
      expect(onChange).toHaveBeenCalledWith([
        mockImage1,
        expect.objectContaining({
          uri: 'file:///new-photo.jpg',
          mimeType: 'image/jpeg',
        }),
      ])
    })
  })

  it('rejects unaccepted format (such as HEIC) returned from picker and surfaces error message', async () => {
    const onChange = jest.fn()
    const onError = jest.fn()
    const launchMock = jest.spyOn(ExpoImagePicker, 'launchImageLibraryAsync')
    launchMock.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'file:///raw-photo.heic',
          fileName: 'raw-photo.heic',
          mimeType: 'image/heic',
          width: 4000,
          height: 3000,
        },
      ],
    })

    const view = await render(
      <ImagePicker
        images={[]}
        onChange={onChange}
        maxImages={4}
        onError={onError}
      />
    )

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: /Adicionar foto/ }))
    })

    await waitFor(() => {
      expect(onChange).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('HEIC/HEIF'))
      expect(view.getByRole('alert')).toBeTruthy()
    })
  })
})
