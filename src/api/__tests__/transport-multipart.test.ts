import { ApiError, request } from '../client'
import { uploadFile } from '../files'
import { send } from '../transport'

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
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({ getBoolean: () => true }),
}))

describe('Multipart transport & uploadFile', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    mockStore.clear()
    mockStore.set('ep.access_token', 'test-access-token')
    mockStore.set('ep.refresh_token', 'test-refresh-token')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('does not set content-type header for FormData bodies so the runtime sets the boundary', async () => {
    const formData = new FormData()
    formData.append('sample', 'value')

    let capturedInit: RequestInit | undefined
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedInit = init
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })

    await send('/api/v1/test-upload', {
      method: 'POST',
      body: formData,
      authenticated: true,
    }, 'test-access-token')

    expect(capturedInit).toBeDefined()
    const headers = capturedInit?.headers as Record<string, string>
    expect(headers['content-type']).toBeUndefined()
    expect(headers.accept).toBe('application/json')
    expect(headers.authorization).toBe('Bearer test-access-token')
    expect(headers['cache-control']).toBe('no-store')
    expect(capturedInit?.body).toBe(formData)
  })

  it('enforces 429 Retry-After deadline on subsequent multipart requests to the same endpoint', async () => {
    const formData = new FormData()
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, {
        status: 429,
        headers: { 'retry-after': '30' },
      })
    )

    await expect(
      send('/api/v1/limited-upload', {
        method: 'POST',
        body: formData,
      })
    ).resolves.toBeDefined()

    // Second request within the 30s window must be blocked immediately before calling fetch
    fetchMock.mockClear()
    await expect(
      send('/api/v1/limited-upload', {
        method: 'POST',
        body: formData,
      })
    ).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: expect.any(Number),
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('discards private 404 response body in multipart requests', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ privateDetail: 'should-be-dropped' }), {
        status: 404,
      })
    )

    const formData = new FormData()
    const error = (await request('/api/v1/files/upload', {
      method: 'POST',
      body: formData,
      authenticated: true,
    }).catch((err: unknown) => err)) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(404)
    expect(error.body).toBeNull()
  })

  it('preserves non-enumerable body on ApiError for multipart responses', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ field: 'file', message: 'invalid format' }), {
        status: 422,
      })
    )

    const formData = new FormData()
    const error = (await request('/api/v1/files/upload', {
      method: 'POST',
      body: formData,
      authenticated: true,
    }).catch((err: unknown) => err)) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(422)
    expect(error.body).toEqual({ field: 'file', message: 'invalid format' })
    // Property must not be enumerable (e.g. JSON.stringify / Object.keys)
    expect(Object.keys(error)).not.toContain('body')
    expect(JSON.stringify(error)).not.toContain('invalid format')
  })

  it('uploadFile helper constructs FormData and performs authenticated POST', async () => {
    const mockUploadResponse = {
      url: 'https://storage.example.com/files/uploaded-photo.jpg',
      clientName: 'photo.jpg',
      fileCategory: 'image',
      fileType: 'image/jpeg',
      size: 1024 * 50,
      extname: 'jpg',
    }

    let capturedUrl: string | undefined
    let capturedInit: RequestInit | undefined
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      capturedUrl = String(url)
      capturedInit = init
      return new Response(JSON.stringify(mockUploadResponse), { status: 201 })
    })

    const result = await uploadFile({
      uri: 'file:///local/photo.jpg',
      name: 'photo.jpg',
      type: 'image/jpeg',
    })

    expect(capturedUrl).toContain('/api/v1/files/upload')
    expect(capturedInit?.method).toBe('POST')
    expect(capturedInit?.body).toBeInstanceOf(FormData)
    expect((capturedInit?.headers as Record<string, string>)?.authorization).toBe('Bearer test-access-token')
    expect(result).toEqual(mockUploadResponse)
  })
})
