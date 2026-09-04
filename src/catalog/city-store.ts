import { createMMKV } from 'react-native-mmkv'
import { useSyncExternalStore } from 'react'

/**
 * The selected city is local discovery state.
 *
 * ADR-0023 §3: changing city never touches the operation. It issues no tenant
 * request, rotates no credential and is restored between launches, which is what
 * `docs/product/03-mvp-e-roadmap.md` means by a persistent city selection.
 */
const CITY_KEY = 'ep.selected_city'

const store = createMMKV({ id: 'ep.discovery' })
const listeners = new Set<() => void>()

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getSelectedCity = (): string | null => store.getString(CITY_KEY) ?? null

export function selectCity(slug: string): void {
  store.set(CITY_KEY, slug)
  listeners.forEach((listener) => listener())
}

export function useSelectedCity(): string | null {
  return useSyncExternalStore(subscribe, getSelectedCity, getSelectedCity)
}
