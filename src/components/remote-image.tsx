import { Image, type ImageProps } from 'expo-image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'

type RemoteImageProps = ImageProps & {
  /** What stands in when the image cannot be shown; nothing when omitted. */
  fallback?: ReactNode
}

const sourceKey = (source: ImageProps['source']) =>
  source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source
    ? (source.uri ?? null)
    : null

/**
 * expo-image builds its Android view from the current Activity. A view created
 * or recreated while the app is in the background (a refetch on reconnect, a
 * theme change delivered to a backgrounded app) fails with `MissingActivity`,
 * and the slot stays empty without ever reporting an error. So an image that
 * rendered while the app was not active is mounted again once it is, and an
 * image that fails to load gives way to its fallback instead of a blank box.
 */
export function RemoteImage({ fallback = null, onError, source, ...props }: RemoteImageProps) {
  const uri = sourceKey(source)
  const [failedUri, setFailedUri] = useState<string | null>(null)
  const [generation, setGeneration] = useState(0)
  const renderedInBackground = useRef(false)

  // Runs after every commit: a commit while inactive may have asked Android for
  // a new view, which is exactly the case that cannot be seen from here.
  useEffect(() => {
    if (AppState.currentState !== 'active') renderedInBackground.current = true
  })

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active' && renderedInBackground.current) {
        renderedInBackground.current = false
        setGeneration((value) => value + 1)
      }
    })
    return () => subscription.remove()
  }, [])

  if (uri !== null && failedUri === uri) return <>{fallback}</>

  return (
    <Image
      key={generation}
      {...props}
      source={source}
      onError={(event) => {
        setFailedUri(uri)
        onError?.(event)
      }}
    />
  )
}
