import { onlineManager } from '@tanstack/react-query'
import { fireEvent, render, waitFor, within } from '@testing-library/react-native'
import { AccessibilityInfo, StyleSheet } from 'react-native'

import { palette } from '@/theme/tokens'

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
  await fireEvent.changeText(
    view.getByLabelText('Pergunta para o Concierge'),
    'Onde passar a tarde?'
  )
  await fireEvent.press(view.getByText('Perguntar'))
  return view
}

beforeEach(() => jest.clearAllMocks())

it('keeps the ask button named while it is busy, and drops busy with the answer', async () => {
  // Android rewrites a busy control's description only from an explicit
  // label; without one the button read just "ocupado" and kept it.
  let answer!: (value: unknown) => void
  api.askAssistant.mockReturnValue(new Promise((resolve) => (answer = resolve)))
  const view = await ask()

  expect(view.getByRole('button', { name: 'Perguntar' }).props.accessibilityState).toMatchObject({
    busy: true,
  })

  answer(reply(false))
  await waitFor(() =>
    expect(view.getByRole('button', { name: 'Perguntar' }).props.accessibilityState).toMatchObject({
      busy: false,
    })
  )
})

it('says when the server applied interests', async () => {
  api.askAssistant.mockResolvedValue(reply(true))

  const view = await ask()

  await waitFor(() => expect(view.getByTestId('concierge-personalized')).toBeTruthy())
  expect(api.askAssistant).toHaveBeenCalledWith(
    { question: 'Onde passar a tarde?', city: 'londrina' },
    expect.anything()
  )
})

// The answer arrives after the question, away from where the person is: it is said once.
it('says the answer when it arrives, and says a failure too', async () => {
  const said = AccessibilityInfo.announceForAccessibility as jest.Mock
  api.askAssistant.mockResolvedValue({
    ...reply(false),
    outcome: 'grounded',
    text: 'Tente o Ateliê.',
  })

  const view = await ask()

  await waitFor(() =>
    expect(said).toHaveBeenCalledWith('Sugestão ancorada no catálogo. Tente o Ateliê.')
  )
  expect(said).toHaveBeenCalledTimes(1)
  expect(view.getByText('Tente o Ateliê.')).toBeOnTheScreen()

  api.askAssistant.mockRejectedValue(new Error('offline'))
  await fireEvent.press(view.getByText('Perguntar'))
  await waitFor(() =>
    expect(said).toHaveBeenLastCalledWith(
      'Não foi possível consultar agora. Tente novamente em instantes.'
    )
  )
})

it('does not claim personalisation the server did not apply', async () => {
  api.askAssistant.mockResolvedValue(reply(false))

  const view = await ask()

  await waitFor(() => expect(api.askAssistant).toHaveBeenCalled())
  expect(view.queryByTestId('concierge-personalized')).toBeNull()
})

it('says a question asked offline never left, in the error colour of the app', async () => {
  api.askAssistant.mockRejectedValue(new TypeError('Network request failed'))
  onlineManager.setOnline(false)
  try {
    const view = await ask()
    const message = await view.findByText(
      'Sem conexão com a internet. Pergunte de novo quando a conexão voltar.'
    )
    expect(message).toHaveStyle({ color: palette.light.destructiveAccent })
    expect(view.queryByText(/Tente novamente em instantes/)).toBeNull()
  } finally {
    onlineManager.setOnline(true)
  }
})

const SHORTCUT_NAMES = [
  'Aberto agora',
  'Comida',
  'Lazer',
  'Serviços',
  'Bem avaliados, nota 4 ou mais',
  'Ticket médio até 50 reais',
  'Ticket médio de 50 a 100 reais',
  'Ticket médio acima de 100 reais',
]

it('offers the shortcuts as optional checkboxes above the question', async () => {
  const view = await render(<DiscoveryAssistant citySlug="londrina" cityName="Londrina" />)

  const row = view.getByTestId('concierge-shortcuts')
  const boxes = within(row).getAllByRole('checkbox')
  expect(boxes.map((box) => box.props.accessibilityLabel)).toEqual(SHORTCUT_NAMES)
  for (const name of SHORTCUT_NAMES) {
    expect(view.getByRole('checkbox', { name })).not.toBeChecked()
  }
  // The visible label stays short; the spoken name says what the value is.
  expect(view.getByText('Até R$ 50')).toBeOnTheScreen()
  expect(view.getByText('Atalhos (opcional)')).toBeOnTheScreen()

  await fireEvent.press(view.getByRole('checkbox', { name: 'Aberto agora' }))
  expect(view.getByRole('checkbox', { name: 'Aberto agora' })).toBeChecked()
  expect(view.getByRole('checkbox', { name: 'Aberto agora' }).props.accessibilityState).toEqual(
    expect.objectContaining({ selected: true, checked: true })
  )
  await fireEvent.press(view.getByRole('checkbox', { name: 'Aberto agora' }))
  expect(view.getByRole('checkbox', { name: 'Aberto agora' })).not.toBeChecked()

  // A shortcut is not a question: the free text stays required.
  await fireEvent.press(view.getByRole('checkbox', { name: 'Comida' }))
  expect(view.getByRole('button', { name: 'Perguntar' })).toBeDisabled()
  await fireEvent.press(view.getByText('Perguntar'))
  expect(api.askAssistant).not.toHaveBeenCalled()
})

it('wraps the shortcuts and keeps every chip a full touch target inside the row', async () => {
  const view = await render(<DiscoveryAssistant citySlug="londrina" cityName="Londrina" />)

  // Wrapping, not a horizontal strip: larger text grows the row downwards.
  expect(view.getByTestId('concierge-shortcuts')).toHaveStyle({
    flexDirection: 'row',
    flexWrap: 'wrap',
  })
  for (const box of view.getAllByRole('checkbox')) {
    const style = StyleSheet.flatten(box.props.style)
    expect(style.minHeight).toBeGreaterThanOrEqual(44)
    expect(style.maxWidth).toBe('100%')
    // No hit slop: on Android it would not reach past the row's edge.
    expect(box.props.hitSlop).toBeUndefined()
  }
})

it('sends the ticked shortcuts with the question', async () => {
  api.askAssistant.mockResolvedValue(reply(false))
  const view = await render(<DiscoveryAssistant citySlug="londrina" cityName="Londrina" />)

  for (const name of [
    'Serviços',
    'Aberto agora',
    'Lazer',
    'Bem avaliados, nota 4 ou mais',
    'Ticket médio até 50 reais',
  ]) {
    await fireEvent.press(view.getByRole('checkbox', { name }))
  }
  await fireEvent.changeText(view.getByLabelText('Pergunta para o Concierge'), 'algo para hoje')
  await fireEvent.press(view.getByText('Perguntar'))

  await waitFor(() =>
    expect(api.askAssistant).toHaveBeenCalledWith(
      {
        question: 'algo para hoje',
        city: 'londrina',
        filters: {
          open_now: true,
          kind: ['leisure', 'services'],
          min_rating: 4,
          price: ['up_to_50'],
        },
      },
      expect.anything()
    )
  )
})

it('says when nothing matches the shortcuts instead of blaming the assistant', async () => {
  const said = AccessibilityInfo.announceForAccessibility as jest.Mock
  api.askAssistant.mockResolvedValue(reply(false))
  const view = await render(<DiscoveryAssistant citySlug="londrina" cityName="Londrina" />)

  await fireEvent.press(view.getByRole('checkbox', { name: 'Ticket médio acima de 100 reais' }))
  await fireEvent.changeText(view.getByLabelText('Pergunta para o Concierge'), 'jantar especial')
  await fireEvent.press(view.getByText('Perguntar'))

  const nothing =
    'Nenhum lugar publicado combina com esses atalhos agora. Desmarque algum e pergunte de novo.'
  expect(await view.findByText(nothing)).toBeOnTheScreen()
  expect(view.queryByText(/O assistente está indisponível agora/)).toBeNull()
  await waitFor(() => expect(said).toHaveBeenLastCalledWith(`Sugestões do catálogo. ${nothing}`))

  // Unticking afterwards does not rewrite the answer already on screen.
  await fireEvent.press(view.getByRole('checkbox', { name: 'Ticket médio acima de 100 reais' }))
  expect(view.getByText(nothing)).toBeOnTheScreen()
})

it('without shortcuts, an empty degraded reply keeps the unavailable copy', async () => {
  api.askAssistant.mockResolvedValue(reply(false))

  const view = await ask()

  expect(
    await view.findByText(
      'O assistente está indisponível agora, então trouxe opções publicadas no catálogo.'
    )
  ).toBeOnTheScreen()
})
