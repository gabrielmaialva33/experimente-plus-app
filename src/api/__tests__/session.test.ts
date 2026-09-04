const mockStore = new Map<string, string>()
const mockFlags = new Map<string, boolean>()

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked-this-device-only',
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value)
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key)
  }),
}))

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getBoolean: (key: string) => mockFlags.get(key),
    set: (key: string, value: boolean) => mockFlags.set(key, value),
  }),
}))

const payload = (suffix: string) => ({
  access_token: `access-${suffix}`,
  refresh_token: `refresh-${suffix}`,
  token_type: 'Bearer',
  expires_in: 900,
  refresh_expires_in: 259200,
})

const seedSession = () => {
  mockStore.set('ep.access_token', 'access-0')
  mockStore.set('ep.refresh_token', 'refresh-0')
  mockStore.set('ep.access_expires_at', String(Date.now() + 900_000))
  mockFlags.set('ep.install_sentinel', true)
}

const loadSession = () => {
  jest.resetModules()
  // Dynamic import needs --experimental-vm-modules under Jest; require keeps the
  // module registry reset working without changing the runner's flags.
  return require('../session') as typeof import('../session')
}

beforeEach(() => {
  mockStore.clear()
  mockFlags.clear()
  jest.clearAllMocks()
})

describe('credential rotation', () => {
  it('serializes concurrent consumers into a single rotation', async () => {
    seedSession()
    const { rotateCredentials } = loadSession()

    let consumed = 0
    const consume = jest.fn(async (token: string) => {
      consumed += 1
      expect(token).toBe('refresh-0')
      await new Promise((resolve) => setTimeout(resolve, 20))
      return payload('1')
    })

    // Renewal, operation creation and operation switch all consume the same
    // credential: the server revokes the parent and mints exactly one child, so
    // two concurrent consumers would produce one success and one 401.
    const [a, b, c] = await Promise.all([
      rotateCredentials(consume),
      rotateCredentials(consume),
      rotateCredentials(consume),
    ])

    expect(consumed).toBe(1)
    expect(a).toEqual(b)
    expect(b).toEqual(c)
    expect(a.refreshToken).toBe('refresh-1')
  })

  it('persists the child pair and allows a later, separate rotation', async () => {
    seedSession()
    const { rotateCredentials, readCredentials } = loadSession()

    await rotateCredentials(async () => payload('1'))
    expect(mockStore.get('ep.refresh_token')).toBe('refresh-1')

    await rotateCredentials(async (token) => {
      expect(token).toBe('refresh-1')
      return payload('2')
    })

    await expect(readCredentials()).resolves.toMatchObject({ refreshToken: 'refresh-2' })
  })

  it('ends the local session when the server rejects the credential', async () => {
    seedSession()
    const { rotateCredentials, readCredentials, SessionExpiredError } = loadSession()

    await expect(
      rotateCredentials(async () => {
        throw new SessionExpiredError()
      })
    ).rejects.toBeInstanceOf(SessionExpiredError)

    await expect(readCredentials()).resolves.toBeNull()
    expect(mockStore.size).toBe(0)
  })

  it('keeps the credential when the failure is not a rejection', async () => {
    seedSession()
    const { rotateCredentials } = loadSession()

    await expect(rotateCredentials(async () => Promise.reject(new Error('offline')))).rejects.toThrow(
      'offline'
    )
    expect(mockStore.get('ep.refresh_token')).toBe('refresh-0')
  })
})

describe('install sentinel', () => {
  it('discards a credential left by a previous install', async () => {
    // The iOS keychain survives uninstall; MMKV does not. A stored credential
    // with no sentinel therefore belongs to an installation that is gone.
    mockStore.set('ep.access_token', 'ghost')
    mockStore.set('ep.refresh_token', 'ghost')
    const { readCredentials } = loadSession()

    await expect(readCredentials()).resolves.toBeNull()
    expect(mockStore.size).toBe(0)
    expect(mockFlags.get('ep.install_sentinel')).toBe(true)
  })

  it('keeps the credential once the sentinel exists', async () => {
    seedSession()
    const { readCredentials } = loadSession()

    await expect(readCredentials()).resolves.toMatchObject({ refreshToken: 'refresh-0' })
  })
})

describe('credential storage', () => {
  it('binds credentials to this device and clears a partial write', async () => {
    seedSession()
    // The mock must be read after resetModules, or it is a different instance
    // from the one the module under test holds.
    const { writeCredentials } = loadSession()
    const SecureStore = jest.requireMock('expo-secure-store') as {
      setItemAsync: jest.Mock
      deleteItemAsync: jest.Mock
    }

    await writeCredentials({ accessToken: 'a', refreshToken: 'r', accessExpiresAt: 1 })
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('ep.access_token', 'a', {
      keychainAccessible: 'when-unlocked-this-device-only',
    })

    SecureStore.setItemAsync.mockRejectedValueOnce(new Error('keychain refused'))
    await expect(
      writeCredentials({ accessToken: 'x', refreshToken: 'y', accessExpiresAt: 2 })
    ).rejects.toThrow('failed to persist credentials')
    expect(mockStore.size).toBe(0)
  })
})

describe('refreshSession', () => {
  it('unwraps the auth envelope every credential endpoint returns', async () => {
    // Reading the body directly yields undefined tokens, the keystore rejects
    // them, and the session is wiped on every renewal — once per access token
    // lifetime. This is the regression guard for that.
    seedSession()
    const { refreshSession, readCredentials } = loadSession()

    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ auth: payload('renewed') }),
    })) as unknown as typeof fetch

    const credentials = await refreshSession()

    expect(credentials.accessToken).toBe('access-renewed')
    expect(credentials.refreshToken).toBe('refresh-renewed')
    await expect(readCredentials()).resolves.toMatchObject({ accessToken: 'access-renewed' })
  })

  it('ends the session when the server rejects the refresh token', async () => {
    seedSession()
    const { refreshSession, readCredentials, SessionExpiredError } = loadSession()

    globalThis.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
    })) as unknown as typeof fetch

    await expect(refreshSession()).rejects.toBeInstanceOf(SessionExpiredError)
    await expect(readCredentials()).resolves.toBeNull()
  })
})
