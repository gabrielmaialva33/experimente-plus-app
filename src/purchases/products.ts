import type { PurchaseProduct } from '@/api/purchases'

export function productLabel(product: PurchaseProduct) {
  return product.product_type === 'offer'
    ? `Voucher avulso · ${product.establishment.public_name}`
    : `Pacote da cidade · ${product.city.name}`
}

export const productKey = (product: PurchaseProduct) => `${product.edition_id}:${product.offer_id ?? 'edition'}`

export function productRoute(product: PurchaseProduct, origin: 'wallet' | 'establishment') {
  const path = origin === 'wallet' ? '/wallet/edicao' : '/compra'
  return `${path}/${product.edition_id}${product.offer_id == null ? '' : `?offerId=${product.offer_id}`}` as
    `/wallet/edicao/${number}` | `/compra/${number}`
}

/** Malformed voucher links must never silently select the city package. */
export function productIdentity(id: unknown, offerId: unknown) {
  const positiveId = (value: unknown) => typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))
  if (!positiveId(id) || (offerId !== undefined && !positiveId(offerId))) return null
  return { editionId: Number(id), offerId: offerId === undefined ? null : Number(offerId) }
}
