import { fireEvent, render } from '@testing-library/react-native'

import { Avatar, initialsOf } from '@/components/avatar'
import { Checkbox } from '@/components/checkbox'
import { EmptyState } from '@/components/empty-state'
import { ListGroup, ListRow } from '@/components/list-row'
import { TextField } from '@/components/text-field'
import { minTouch, palette } from '@/theme/tokens'

jest.mock('@/theme/use-colors', () => ({ useColors: jest.fn() }))
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon')

const theme = jest.requireMock('@/theme/use-colors') as { useColors: jest.Mock }
beforeEach(() => theme.useColors.mockReturnValue(palette.light))

describe('TextField', () => {
  it('keeps its label while typing and puts the error on the field', async () => {
    const change = jest.fn()
    const view = await render(<TextField label="E-mail" value="ana@" onChangeText={change} error="Informe um e-mail válido." />)
    expect(view.getByText('E-mail')).toBeOnTheScreen()
    const input = view.getByLabelText('E-mail')
    expect(input.props.accessibilityHint).toBe('Informe um e-mail válido.')
    expect(view.getByRole('alert')).toHaveTextContent('Informe um e-mail válido.')
    await fireEvent.changeText(input, 'ana@example.com')
    expect(change).toHaveBeenCalledWith('ana@example.com')
  })

  it('shows and hides a password on request', async () => {
    const view = await render(<TextField label="Senha" value="segredo123" onChangeText={jest.fn()} secure />)
    expect(view.getByLabelText('Senha').props.secureTextEntry).toBe(true)
    await fireEvent.press(view.getByRole('button', { name: 'Mostrar senha' }))
    expect(view.getByLabelText('Senha').props.secureTextEntry).toBe(false)
    expect(view.getByRole('button', { name: 'Ocultar senha' })).toHaveStyle({ width: minTouch, height: minTouch })
  })
})

describe('ListRow and ListGroup', () => {
  it('draws a titled group of rows that open screens, with a value in the name read aloud', async () => {
    const open = jest.fn()
    const view = await render(
      <ListGroup title="Minhas coisas">
        <ListRow icon="heart-outline" label="Favoritos" value="3 lugares" onPress={open} />
      </ListGroup>
    )
    expect(view.getByRole('header', { name: 'Minhas coisas' })).toBeOnTheScreen()
    await fireEvent.press(view.getByRole('button', { name: 'Favoritos, 3 lugares' }))
    expect(open).toHaveBeenCalled()
  })

  it('draws the destructive row in red, without the chevron', async () => {
    const view = await render(<ListRow icon="trash-outline" label="Excluir conta" onPress={jest.fn()} tone="destructive" />)
    expect(view.getByText('Excluir conta')).toHaveStyle({ color: palette.light.destructiveAccent })
    expect(view.queryByTestId('list-row-chevron', { includeHiddenElements: true })).toBeNull()
  })
})

describe('Avatar', () => {
  it.each([
    ['Ana Maria Silva', 'AS'],
    ['ana', 'A'],
    ['  ', '?'],
    [null, '?'],
    ['élida souza', 'ÉS'],
  ])('reads %p as %p', (name, expected) => {
    expect(initialsOf(name)).toBe(expected)
  })

  it('stays out of the accessibility tree: the name beside it already says who', async () => {
    const view = await render(<Avatar name="Ana Silva" />)
    const avatar = view.getByTestId('avatar', { includeHiddenElements: true })
    expect(avatar.props.importantForAccessibility).toBe('no-hide-descendants')
    expect(avatar.props.accessibilityElementsHidden).toBe(true)
    expect(view.queryByText('AS')).toBeNull()
    expect(view.getByText('AS', { includeHiddenElements: true })).toBeTruthy()
  })
})

describe('Checkbox', () => {
  it('always draws its box and reports the checked state', async () => {
    const toggle = jest.fn()
    const view = await render(<Checkbox label="Aceito os termos" checked={false} onPress={toggle} testID="terms" />)
    const box = view.getByTestId('terms-box')
    expect(box).toHaveStyle({ width: 24, height: 24, borderWidth: 2, borderColor: palette.light.choiceBorder })
    const checkbox = view.getByRole('checkbox', { name: 'Aceito os termos', checked: false })
    expect(checkbox).toHaveStyle({ minHeight: minTouch })
    await fireEvent.press(checkbox)
    expect(toggle).toHaveBeenCalled()
  })
})

describe('EmptyState', () => {
  it('says what goes here and offers the way to fill it', async () => {
    const go = jest.fn()
    const view = await render(
      <EmptyState icon="heart-outline" title="Nenhum favorito ainda" text="Toque no coração de um lugar." action={{ label: 'Explorar lugares', onPress: go }} />
    )
    expect(view.getByRole('header', { name: 'Nenhum favorito ainda' })).toBeOnTheScreen()
    await fireEvent.press(view.getByRole('button', { name: 'Explorar lugares' }))
    expect(go).toHaveBeenCalled()
  })
})
