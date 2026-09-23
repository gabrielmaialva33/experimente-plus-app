import {
  decode,
  responseError,
  send,
  type RequestOptions,
} from './transport'

export type PublicRequestOptions = Omit<RequestOptions, 'authenticated'> & {
  authenticated?: never
}

/**
 * Transport for public discovery routes.
 *
 * Keeping it separate from the authenticated client is deliberate: importing
 * public catalogue features must not initialize SecureStore/MMKV or make the
 * existence of a local session part of anonymous discovery.
 */
export async function publicRequest<T>(
  path: string,
  options: PublicRequestOptions = {}
): Promise<T> {
  const response = await send(path, options)

  if (response.ok) {
    return (await decode(response)) as T
  }

  throw await responseError(response, Boolean(options.sensitive))
}
