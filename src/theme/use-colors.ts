import { useColorScheme } from 'react-native'

import { palette, type Colors } from './tokens'

export function useColors(): Colors {
  const scheme = useColorScheme()
  return palette[scheme === 'dark' ? 'dark' : 'light']
}
