import { randomUUID } from 'expo-crypto'
import { createMMKV } from 'react-native-mmkv'

import { apiBaseUrl } from '@/api/config'
import type { CreatePurchaseRequest } from '@/api/purchases'

type IntentBody = Pick<CreatePurchaseRequest, 'edition_id' | 'offer_id' | 'amount_cents' | 'terms_version' | 'method'>
interface Intent { key: string; body: IntentBody }
const storage = createMMKV({ id: 'ep.purchase-intentions' })
// Keep the legacy package slot so interrupted purchases survive this upgrade.
const slot = (userId: number, editionId: number, offerId: number | null = null) =>
  JSON.stringify(offerId == null ? [apiBaseUrl, userId, editionId] : [apiBaseUrl, userId, editionId, offerId])

/** Only an opaque intent and quote identifiers; never payment instructions or credentials. */
export function readIntent(userId: number, editionId: number, offerId: number | null = null): Intent | null {
  const stored = storage.getString(slot(userId, editionId, offerId))
  if (!stored) return null
  return JSON.parse(stored) as Intent
}

export function purchaseIntent(userId: number, body: IntentBody): Intent {
  const prior = readIntent(userId, body.edition_id, body.offer_id)
  if (prior) return prior
  const intent = { key: randomUUID(), body: {
    edition_id: body.edition_id, offer_id: body.offer_id ?? null, amount_cents: body.amount_cents,
    terms_version: body.terms_version, method: body.method,
  } }
  // Persist before sending: an ambiguous response must retain exactly this key/body.
  storage.set(slot(userId, body.edition_id, body.offer_id), JSON.stringify(intent))
  return intent
}

export const clearIntent = (userId: number, editionId: number, offerId: number | null = null) =>
  storage.remove(slot(userId, editionId, offerId))
