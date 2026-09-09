import type { CreatePurchaseRequest } from '@/api/purchases'
import { randomUUID } from 'expo-crypto'
const mockStorage = new Map<string, string>()
jest.mock('react-native-mmkv', () => ({ createMMKV: () => ({
  getString: (key: string) => mockStorage.get(key),
  set: (key: string, value: string) => mockStorage.set(key, value),
  remove: (key: string) => mockStorage.delete(key),
}) }))
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'stable-intention-123') }))

import { clearIntent, purchaseIntent, readIntent } from '../intent-store'
import { apiBaseUrl } from '@/api/config'

beforeEach(() => mockStorage.clear())

it('retains key and original quote/method across retries and module reloads', () => {
  const body: CreatePurchaseRequest = { edition_id: 2, amount_cents: 10000, terms_version: 'a'.repeat(64), method: 'pix' }
  const original = purchaseIntent(1, body)
  expect(purchaseIntent(1, { ...body, amount_cents: 20000 })).toEqual(original)
  jest.resetModules()
  const reloaded = require('../intent-store') as typeof import('../intent-store')
  expect(reloaded.readIntent(1, 2)).toEqual(original)
  expect(readIntent(2, 2)).toBeNull()
  expect(readIntent(1, 3)).toBeNull()
  clearIntent(1, 2)
  expect(readIntent(1, 2)).toBeNull()
})

it('stores only quote fields even when a generated request carries optional sensitive input', () => {
  const body: CreatePurchaseRequest = {
    edition_id: 2, amount_cents: 10000, terms_version: 'a'.repeat(64), method: 'card',
    card_token: 'private-token', document_type: 'CPF', document_number: '12345678900', payment_method_id: 'provider-id',
  }
  purchaseIntent(1, body)
  expect(readIntent(1, 2)?.body).toEqual({
    offer_id: null,
    edition_id: 2, amount_cents: 10000, terms_version: 'a'.repeat(64), method: 'card',
  })
  expect([...mockStorage.values()].join('')).not.toMatch(/private-token|12345678900|provider-id/)
})

it('isolates the package and each voucher quote, key and cleanup within the same edition', () => {
  jest.mocked(randomUUID).mockReturnValueOnce('package-key').mockReturnValueOnce('cafe-key').mockReturnValueOnce('bistro-key')
  const bodies: CreatePurchaseRequest[] = [null, 3, 4].map((offer_id, index) => ({
    edition_id: 2, offer_id, amount_cents: offer_id ? 1490 : 4990,
    terms_version: ['a', 'b', 'c'][index].repeat(64), method: 'pix',
  }))
  const intents = bodies.map((body) => purchaseIntent(1, body))
  expect(new Set(intents.map((intent) => intent.key)).size).toBe(3)
  for (const [index, body] of bodies.entries()) {
    expect(readIntent(1, 2, body.offer_id)?.body).toEqual(body)
    expect(purchaseIntent(1, { ...body, terms_version: 'd'.repeat(64) })).toEqual(intents[index])
  }
  clearIntent(1, 2, 3)
  expect(readIntent(1, 2, 3)).toBeNull()
  expect(readIntent(1, 2)).toEqual(intents[0])
  expect(readIntent(1, 2, 4)).toEqual(intents[2])
})

it('retains the exact pre-upgrade package body without exposing it to a voucher retry', () => {
  const old = { key: 'old-key', body: { edition_id: 2, amount_cents: 4990, terms_version: 'a'.repeat(64), method: 'pix' } }
  mockStorage.set(JSON.stringify([apiBaseUrl, 1, 2]), JSON.stringify(old))
  expect(readIntent(1, 2, null)).toEqual(old)
  expect(readIntent(1, 2, 3)).toBeNull()
})
