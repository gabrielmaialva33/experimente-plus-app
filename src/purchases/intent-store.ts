import { randomUUID } from 'expo-crypto'
import { createMMKV } from 'react-native-mmkv'

import { apiBaseUrl } from '@/api/config'
import type { CreatePurchaseRequest } from '@/api/purchases'

type IntentBody = Pick<CreatePurchaseRequest, 'edition_id' | 'amount_cents' | 'terms_version' | 'method'>
interface Intent { key: string; body: IntentBody }
const storage = createMMKV({ id: 'ep.purchase-intentions' })
const slot = (userId: number, editionId: number) => JSON.stringify([apiBaseUrl, userId, editionId])

/** Only an opaque intent and quote identifiers; never payment instructions or credentials. */
export function readIntent(userId: number, editionId: number): Intent | null {
  const stored = storage.getString(slot(userId, editionId))
  if (!stored) return null
  return JSON.parse(stored) as Intent
}

export function purchaseIntent(userId: number, body: IntentBody): Intent {
  const prior = readIntent(userId, body.edition_id)
  if (prior) return prior
  const intent = { key: randomUUID(), body: {
    edition_id: body.edition_id, amount_cents: body.amount_cents,
    terms_version: body.terms_version, method: body.method,
  } }
  // Persist before sending: an ambiguous response must retain exactly this key/body.
  storage.set(slot(userId, body.edition_id), JSON.stringify(intent))
  return intent
}

export const clearIntent = (userId: number, editionId: number) =>
  storage.remove(slot(userId, editionId))
