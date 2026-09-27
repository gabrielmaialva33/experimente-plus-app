import { onlineManager } from '@tanstack/react-query'
import { act, render } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'

import { ContentSkeleton } from '../content-skeleton'
import { palette } from '@/theme/tokens'

jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))

it.each(['light', 'dark'] as const)(
  'keeps placeholder geometry stable across renders in %s',
  async (mode) => {
    jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette[mode])
    for (const variant of ['catalog', 'list', 'detail', 'presentation'] as const) {
      const screen = <ContentSkeleton label="Carregando" variant={variant} />
      const view = await render(screen)
      for (let pass = 0; pass < 2; pass++) {
        expect(view.getByRole('progressbar', { name: 'Carregando' })).toHaveStyle({
          backgroundColor: palette[mode].background,
        })
        const titles = view.getAllByTestId('skeleton-title', { includeHiddenElements: true })
        expect(titles).toHaveLength(variant === 'list' || variant === 'catalog' ? 3 : 1)
        for (const title of titles)
          expect(title).toHaveStyle({
            height: 24,
            width: '70%',
            backgroundColor: palette[mode].border,
          })
        expect(view.queryByRole('button')).toBeNull()
        if (variant === 'presentation') {
          expect(view.getByTestId('skeleton-qr-slot', { includeHiddenElements: true })).toHaveStyle(
            { width: 240, maxWidth: '100%', aspectRatio: 1 }
          )
        }
        await view.rerender(screen)
      }
      await view.unmount()
    }
  }
)

describe('offline', () => {
  afterEach(() => onlineManager.setOnline(true))

  it('says a paused first load waits for the connection, and fills in when it returns', async () => {
    jest.requireMock('@/theme/use-colors').useColors.mockReturnValue(palette.light)
    const spoken = jest.spyOn(AccessibilityInfo, 'announceForAccessibility')
    onlineManager.setOnline(false)
    const view = await render(<ContentSkeleton label="Carregando lugar" variant="catalog" />)

    expect(view.getByRole('header', { name: 'Sem conexão com a internet' })).toBeOnTheScreen()
    expect(view.getByText('O conteúdo aparece aqui assim que a conexão voltar.')).toBeOnTheScreen()
    expect(view.queryByRole('progressbar')).toBeNull()
    expect(spoken).toHaveBeenCalledWith(
      'Sem conexão com a internet. O conteúdo aparece aqui assim que a conexão voltar.'
    )

    await act(async () => onlineManager.setOnline(true))
    expect(view.queryByTestId('content-offline')).toBeNull()
    expect(view.getByRole('progressbar', { name: 'Carregando lugar' })).toBeOnTheScreen()
  })
})
