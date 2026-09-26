import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react-native'

import { SessionCacheGuard } from '@/session/cache-guard'

const mockSession = { current: { status: 'anonymous', context: null } as { status: string; context: unknown } }
jest.mock('@/session/context', () => ({ useSession: () => mockSession.current }))

const signedIn = (userId: number, operationId = 1) => ({
  status: 'authenticated',
  context: { user: { id: userId }, active_operation: { id: operationId } },
})

const favourites = ['explorer', 'saved', 'establishment']

async function mountWith(client: QueryClient) {
  const view = await render(
    <QueryClientProvider client={client}>
      <SessionCacheGuard />
    </QueryClientProvider>
  )
  const move = async (next: { status: string; context: unknown }) => {
    mockSession.current = next
    await view.rerender(
      <QueryClientProvider client={client}>
        <SessionCacheGuard />
      </QueryClientProvider>
    )
  }
  return move
}

// No garbage-collection timers: a cached list left behind keeps jest from exiting.
const newClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })

it('drops the previous person’s lists when they sign out', async () => {
  const client = newClient()
  mockSession.current = signedIn(7)
  const move = await mountWith(client)
  client.setQueryData(favourites, ['casa-de-petiscos'])

  await move({ status: 'loading', context: null })
  expect(client.getQueryData(favourites)).toEqual(['casa-de-petiscos'])
  await move({ status: 'anonymous', context: null })

  expect(client.getQueryData(favourites)).toBeUndefined()
})

it('drops them when another account or another operation takes the session', async () => {
  const client = newClient()
  mockSession.current = signedIn(7)
  const move = await mountWith(client)
  client.setQueryData(favourites, ['casa-de-petiscos'])
  await move(signedIn(8))
  expect(client.getQueryData(favourites)).toBeUndefined()

  client.setQueryData(favourites, ['atelie-do-cafe'])
  await move(signedIn(8, 2))
  expect(client.getQueryData(favourites)).toBeUndefined()
})

it('keeps the cache through a revalidation, a network failure and a visitor signing in', async () => {
  const client = newClient()
  mockSession.current = { status: 'anonymous', context: null }
  const move = await mountWith(client)
  client.setQueryData(['catalog', 'londrina'], ['public'])
  await move(signedIn(7))
  expect(client.getQueryData(['catalog', 'londrina'])).toEqual(['public'])

  client.setQueryData(favourites, ['casa-de-petiscos'])
  await move({ status: 'loading', context: null })
  await move({ status: 'unavailable', context: null })
  await move(signedIn(7))
  expect(client.getQueryData(favourites)).toEqual(['casa-de-petiscos'])
})
