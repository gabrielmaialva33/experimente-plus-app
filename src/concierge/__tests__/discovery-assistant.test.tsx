import { fireEvent, render, waitFor } from '@testing-library/react-native'

import { DiscoveryAssistant } from '@/concierge/discovery-assistant'

jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')
jest.mock('@/theme/use-colors', () => ({
  useColors: () => jest.requireActual('@/theme/tokens').palette.light,
}))
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/session/context', () => ({
  useSession: jest.fn(() => {
    throw new Error('The assistant must not read the session')
  }),
}))
jest.mock('@/api/concierge', () => ({ askAssistant: jest.fn() }))

const api = jest.requireMock('@/api/concierge') as { askAssistant: jest.Mock }

const reply = (personalized: boolean) => ({
  outcome: 'degraded',
  text: null,
  items: [],
  model: null,
  personalized,
})

async function ask() {
  const view = await render(<DiscoveryAssistant citySlug="londrina" cityName="Londrina" />)
  await fireEvent.changeText(view.getByLabelText('Pergunta para o Concierge'), 'Onde passar a tarde?')
  await fireEvent.press(view.getByText('Perguntar'))
  return view
}

beforeEach(() => jest.clearAllMocks())

it('says when the server applied interests', async () => {
  api.askAssistant.mockResolvedValue(reply(true))

  const view = await ask()

  await waitFor(() => expect(view.getByTestId('concierge-personalized')).toBeTruthy())
  expect(api.askAssistant).toHaveBeenCalledWith(
    { question: 'Onde passar a tarde?', city: 'londrina' },
    expect.anything()
  )
})

it('does not claim personalisation the server did not apply', async () => {
  api.askAssistant.mockResolvedValue(reply(false))

  const view = await ask()

  await waitFor(() => expect(api.askAssistant).toHaveBeenCalled())
  expect(view.queryByTestId('concierge-personalized')).toBeNull()
})
