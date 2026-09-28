import { act, fireEvent, render } from '@testing-library/react-native'

import { ActionMenu } from '@/components/action-menu'

const menu = (onPress: () => void | Promise<unknown>) =>
  render(
    <ActionMenu
      accessibilityLabel="Mais opções: Oficina"
      title="Oficina"
      items={[{ label: 'Compartilhar', icon: 'share-outline', onPress }]}
    />
  )

/** A closed sheet renders none of its options. */
const sheetOpen = (view: Awaited<ReturnType<typeof menu>>) =>
  view.queryByRole('button', { name: 'Compartilhar' }) !== null

/** Lets Node report a rejection nobody handled, which it does after the microtasks. */
const nextMacrotask = () => new Promise<void>((resolve) => setImmediate(() => resolve()))

it('keeps the options open until an action that returns a promise settles', async () => {
  let settle!: () => void
  const view = await menu(
    () =>
      new Promise<void>((resolve) => {
        settle = resolve
      })
  )
  await fireEvent.press(view.getByRole('button', { name: 'Mais opções: Oficina' }))
  await fireEvent.press(view.getByRole('button', { name: 'Compartilhar' }))
  expect(sheetOpen(view)).toBe(true)

  await act(async () => settle())
  expect(sheetOpen(view)).toBe(false)
})

// Share.share rejects when the system cannot present its sheet.
it('closes after an action that fails, without an unhandled rejection', async () => {
  const unhandled = jest.fn()
  process.on('unhandledRejection', unhandled)
  try {
    const view = await menu(() => Promise.reject(new Error('share unavailable')))
    await fireEvent.press(view.getByRole('button', { name: 'Mais opções: Oficina' }))
    await act(async () => {
      await fireEvent.press(view.getByRole('button', { name: 'Compartilhar' }))
      await nextMacrotask()
    })

    expect(sheetOpen(view)).toBe(false)
    expect(unhandled).not.toHaveBeenCalled()
  } finally {
    process.off('unhandledRejection', unhandled)
  }
})

it('closes at once after a plain action', async () => {
  const onPress = jest.fn()
  const view = await menu(onPress)
  await fireEvent.press(view.getByRole('button', { name: 'Mais opções: Oficina' }))
  await fireEvent.press(view.getByRole('button', { name: 'Compartilhar' }))

  expect(onPress).toHaveBeenCalledTimes(1)
  expect(sheetOpen(view)).toBe(false)
})
