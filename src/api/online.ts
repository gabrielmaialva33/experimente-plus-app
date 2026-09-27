import { onlineManager } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

const subscribe = (listener: () => void) => onlineManager.subscribe(listener)
const isOnline = () => onlineManager.isOnline()

/**
 * Whether the device has a connection, as the query layer sees it.
 *
 * `installQueryEnvironment` feeds `onlineManager` from expo-network. While it
 * reads offline, TanStack pauses every fetch instead of failing it: a first
 * load stays pending and a refetch never settles until the connection returns.
 * Screens use this to say so rather than wait in silence.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, isOnline, isOnline)
}

/** The same, outside React. */
export { isOnline }

/** Resolves the first time the device goes offline; `cancel` stops listening. */
export function whenOffline(): { promise: Promise<void>; cancel: () => void } {
  let cancel = () => {}
  const promise = new Promise<void>((resolve) => {
    cancel = onlineManager.subscribe((online) => {
      if (!online) resolve()
    })
  })
  return { promise, cancel }
}

/** What a person hears and reads when an action needs the connection that is missing. */
export const OFFLINE_MESSAGE = 'Sem conexão com a internet.'

/** What a paused first load is waiting for; the fetch resumes by itself. */
export const OFFLINE_WAITING = 'O conteúdo aparece aqui assim que a conexão voltar.'

/** A "Carregando…" line that says, offline, what it is really waiting for. */
export function useLoadingCopy(loading: string): string {
  return useOnline() ? loading : `${OFFLINE_MESSAGE} ${OFFLINE_WAITING}`
}
