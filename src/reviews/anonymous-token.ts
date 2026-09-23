import { randomUUID } from 'expo-crypto'
import { createMMKV } from 'react-native-mmkv'

/**
 * The opaque token an anonymous report carries — ADR-0027 scenario 14.
 *
 * It lets the server recognise this device reporting the same thing twice even
 * after a change of network, and nothing else: the server keeps only a keyed
 * hash of it, scoped to each target, and it opens no session and grants no
 * access. That is why it lives in MMKV and not in SecureStore, which this app
 * reserves for credentials. Losing it — a reinstall — costs nothing but the
 * recognition of a repeat; someone reading it could at most make their own
 * report look like this device's repeat.
 */
const TOKEN_KEY = 'ep.anonymous_report_token'

const store = createMMKV({ id: 'ep.reports' })

export function anonymousReportToken(): string {
  const existing = store.getString(TOKEN_KEY)
  if (existing) return existing

  const token = randomUUID()
  store.set(TOKEN_KEY, token)
  return token
}
