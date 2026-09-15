import { createQueryClient } from '../query-client'
import { ApiError } from '../client'
import { SessionExpiredError } from '../session'

jest.mock('expo-network', () => ({}))
jest.mock('expo-secure-store', () => ({}))
jest.mock('react-native-mmkv', () => ({ createMMKV: () => ({}) }))

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

it.each([400, 401, 403, 404, 409, 422, 429])('does not automatically retry HTTP %s', async (status) => {
  const client = createQueryClient()
  const queryFn = jest.fn(async () => { throw new ApiError(status, null, status === 429 ? 60 : undefined) })
  await expect(client.fetchQuery({ queryKey: ['private'], queryFn })).rejects.toMatchObject({ status })
  expect(queryFn).toHaveBeenCalledTimes(1)
  client.clear()
})

it('does not retry a rejected session', async () => {
  const client = createQueryClient()
  const queryFn = jest.fn(async () => { throw new SessionExpiredError() })
  await expect(client.fetchQuery({ queryKey: ['private'], queryFn })).rejects.toBeInstanceOf(SessionExpiredError)
  expect(queryFn).toHaveBeenCalledTimes(1)
  client.clear()
})

it('backs off network reads without changing the city/filter query context', async () => {
  const client = createQueryClient()
  const keys: unknown[] = []
  const times: number[] = []
  const queryKey = ['catalog', 'search', 'londrina', { category: 'cafe' }]
  const pending = client.fetchQuery({ queryKey, queryFn: async (context) => {
    keys.push(context.queryKey)
    times.push(Date.now())
    if (times.length < 3) throw new TypeError('offline')
    return ['result']
  } })
  await jest.advanceTimersByTimeAsync(999)
  expect(times).toHaveLength(1)
  await jest.advanceTimersByTimeAsync(1)
  expect(times).toHaveLength(2)
  await jest.advanceTimersByTimeAsync(1999)
  expect(times).toHaveLength(2)
  await jest.advanceTimersByTimeAsync(1)
  await expect(pending).resolves.toEqual(['result'])
  expect(times[1] - times[0]).toBe(1000)
  expect(times[2] - times[1]).toBe(2000)
  expect(keys).toEqual([queryKey, queryKey, queryKey])
  client.clear()
})

it('does not retry mutations even after an ambiguous network failure', async () => {
  const client = createQueryClient()
  const mutationFn = jest.fn(async () => { throw new TypeError('timeout') })
  const mutation = client.getMutationCache().build(client, { mutationFn })
  await expect(mutation.execute(undefined)).rejects.toThrow('timeout')
  expect(mutationFn).toHaveBeenCalledTimes(1)
  client.clear()
})
