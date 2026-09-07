import type { CreatePurchaseRequest } from '@/api/purchases'
const mockStorage = new Map<string, string>()
jest.mock('react-native-mmkv', () => ({ createMMKV: () => ({
  getString: (key: string) => mockStorage.get(key),
  set: (key: string, value: string) => mockStorage.set(key, value),
  remove: (key: string) => mockStorage.delete(key),
}) }))
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'stable-intention-123') }))

import { clearIntent, purchaseIntent, readIntent } from '../intent-store'

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
    edition_id: 2, amount_cents: 10000, terms_version: 'a'.repeat(64), method: 'card',
  })
  expect([...mockStorage.values()].join('')).not.toMatch(/private-token|12345678900|provider-id/)
})
