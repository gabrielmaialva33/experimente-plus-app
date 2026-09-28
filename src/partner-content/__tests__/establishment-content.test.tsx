import { onlineManager } from '@tanstack/react-query'
import { act, render } from '@testing-library/react-native'

import { EstablishmentPartnerContent } from '@/partner-content/establishment-content'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('@/api/config', () => ({
  apiUrl: (path: string) => path,
  resolveMediaUrl: (url: string) => url,
}))
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/session/context', () => ({ useSession: () => ({ status: 'anonymous' }) }))
jest.mock('@/explorer/queries', () => ({
  useSavedContent: () => ({ data: undefined }),
  useToggleSavedContent: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock('@/partner-content/queries', () => ({
  usePartnerContent: () => ({ data: undefined, isPending: true }),
}))

// Offline the requests are paused rather than failed: "Carregando…" would never end.
it('says what the place’s content is waiting for while the device is offline', async () => {
  const view = await render(
    <EstablishmentPartnerContent
      establishmentId={1}
      timeZone="America/Sao_Paulo"
      establishmentName="Ateliê do Café"
      citySlug="londrina"
      establishmentSlug="atelie"
    />
  )
  expect(view.getByText('Carregando experiências e novidades…')).toBeOnTheScreen()

  try {
    await act(async () => onlineManager.setOnline(false))
    expect(view.getByText(/^Sem conexão com a internet\./)).toBeOnTheScreen()
  } finally {
    await act(async () => onlineManager.setOnline(true))
  }
})
