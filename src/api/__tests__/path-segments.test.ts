import { getCityAgenda } from '../agenda'
import { getEstablishment, listCategories, listFilters, searchEstablishments } from '../catalog'
import { getPartnerReceipt } from '../redemptions'
import { getMyReceipt } from '../wallet'

const mockStore = new Map<string, string>()
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: async (key: string) => mockStore.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    mockStore.set(key, value)
  },
  deleteItemAsync: async (key: string) => {
    mockStore.delete(key)
  },
}))
jest.mock('react-native-mmkv', () => ({ createMMKV: () => ({ getBoolean: () => true }) }))

/**
 * Slugs and receipt codes come from routes, and a route can come from any
 * `experimenteplus://` link. Decoded by the router, `..%2F..%2Fme` arrives as
 * `../../me`; interpolated as is, the URL would resolve to another path of the
 * API — with the session's bearer, for a receipt.
 */
const requested = () => {
  const calls = (globalThis.fetch as jest.Mock).mock.calls
  const [url, init] = calls[calls.length - 1] as [string, RequestInit]
  return { url, authorization: (init.headers as Record<string, string>).authorization }
}

beforeEach(() => {
  mockStore.clear()
  mockStore.set('ep.access_token', 'access-0')
  mockStore.set('ep.refresh_token', 'refresh-0')
  jest
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response('{}', { status: 200 }))
})
afterEach(() => jest.restoreAllMocks())

it('keeps an ordinary slug as it is', async () => {
  await getEstablishment('londrina', 'atelier-do-cafe-demo')
  expect(new URL(requested().url).pathname).toBe(
    '/api/v1/catalog/cities/londrina/establishments/atelier-do-cafe-demo'
  )
})

it.each([
  ['a place', () => getEstablishment('londrina', '../../../me/wallet')],
  ['categories', () => listCategories('../../me/wallet')],
  ['filters', () => listFilters('../../me/wallet')],
  ['a search', () => searchEstablishments('../../me/wallet', { q: 'café' })],
  ['the agenda', () => getCityAgenda('../../me/wallet')],
])('keeps a traversal in the slug of %s inside its segment', async (_, call) => {
  await call()
  const { pathname } = new URL(requested().url)
  expect(pathname.startsWith('/api/v1/catalog/cities/')).toBe(true)
  expect(pathname).toContain('..%2F')
  expect(pathname).not.toMatch(/\/api\/v1\/me\//)
})

it.each([
  ['wallet', () => getMyReceipt('../../../me/wallet?x=1'), '/api/v1/me/benefits/redemptions/'],
  ['partner', () => getPartnerReceipt('../me/wallet?x=1'), '/api/v1/benefit-redemptions/'],
])(
  'keeps a %s receipt code from sending the bearer to another path',
  async (_, call, collection) => {
    await call()
    const { url, authorization } = requested()
    const parsed = new URL(url)
    expect(authorization).toBe('Bearer access-0')
    expect(parsed.pathname.startsWith(collection)).toBe(true)
    expect(parsed.pathname.slice(collection.length)).not.toContain('/')
    expect(parsed.search).toBe('')
  }
)
