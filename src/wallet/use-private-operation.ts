import { useCallback, useEffect, useRef, useState } from 'react'

import { subscribeSessionEvents } from '@/api/session-events'
import { useSession } from '@/session/context'

type State<T> = { data?: T; error?: unknown; status: 'idle' | 'pending' | 'success' | 'error' }

/** Private payloads stay in component state; never register this work with QueryClient. */
export function usePrivateOperation<T, A = void>(
  operation: (args: A, signal: AbortSignal) => Promise<T>,
  options: { onDispose?: () => void; keepPreviousData?: boolean } = {}
) {
  const session = useSession()
  const owner = session.status === 'authenticated'
    ? `${session.context?.user.id}:${session.context?.active_operation?.id}` : undefined
  const firstOwner = useRef(owner)
  if (firstOwner.current === undefined && owner !== undefined) firstOwner.current = owner
  const [state, setState] = useState<State<T>>({ status: 'idle' })
  const [retired, setRetired] = useState(false)
  const live = useRef(false)
  const revoked = useRef(false)
  const version = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const operationRef = useRef<typeof operation | null>(operation)
  const disposeRef = useRef(options.onDispose)
  operationRef.current = operation
  disposeRef.current = options.onDispose
  const ready = session.status === 'authenticated' && owner === firstOwner.current && !retired
  const readyRef = useRef(ready)
  readyRef.current = ready

  const reset = useCallback(() => {
    version.current += 1
    controller.current?.abort()
    controller.current = null
    if (live.current) setState({ status: 'idle' })
  }, [])

  const cancel = useCallback(() => {
    version.current += 1
    controller.current?.abort()
    controller.current = null
    if (live.current) setState((previous) => previous.data === undefined
      ? { status: 'idle' } : { status: 'success', data: previous.data })
  }, [])

  const dispose = useCallback(() => {
    revoked.current = true
    reset()
    disposeRef.current?.()
    if (live.current) setRetired(true)
  }, [reset])

  useEffect(() => {
    live.current = true
    const unsubscribe = subscribeSessionEvents((event) => {
      if (event === 'expired' || event === 'operation-changing') dispose()
    })
    return () => {
      live.current = false
      unsubscribe()
      reset()
      disposeRef.current?.()
      operationRef.current = null
    }
  }, [dispose, reset])

  useEffect(() => {
    if (session.status === 'anonymous' || (owner !== undefined && owner !== firstOwner.current)) dispose()
  }, [session.status, owner, dispose])

  const run = useCallback(async (args: A) => {
    if (!live.current || revoked.current || !readyRef.current || !operationRef.current) return
    version.current += 1
    controller.current?.abort()
    const current = version.current
    const abort = new AbortController()
    controller.current = abort
    setState((previous) => ({ status: 'pending', data: options.keepPreviousData ? previous.data : undefined }))
    try {
      const data = await operationRef.current(args, abort.signal)
      if (live.current && current === version.current && !abort.signal.aborted) {
        setState({ status: 'success', data })
      }
    } catch (error) {
      if (live.current && current === version.current && !abort.signal.aborted) {
        setState({ status: 'error', error })
      }
    } finally {
      if (controller.current === abort) controller.current = null
    }
  }, [options.keepPreviousData])

  const mutate = useCallback((args: A) => { void run(args) }, [run])
  return {
    data: ready ? state.data : undefined,
    error: ready ? state.error : undefined,
    isPending: ready && state.status === 'pending' && (!options.keepPreviousData || state.data === undefined),
    isError: ready && state.status === 'error',
    ready, mutate, cancel,
  }
}
