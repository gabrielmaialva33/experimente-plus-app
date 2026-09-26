import { createMMKV } from 'react-native-mmkv'

// A local flag, not a credential: MMKV is the place for it (ADR 0023).
const store = createMMKV({ id: 'ep.place' })
const KEY = 'follow-explained'

/** Whether this device has already been told what following a place does (audit A27). */
export const followExplained = () => store.getBoolean(KEY) === true

export const markFollowExplained = () => store.set(KEY, true)
