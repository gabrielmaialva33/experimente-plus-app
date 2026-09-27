import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'

/** How much of a view the keyboard covers, both measured in window coordinates. */
export const keyboardOverlap = (viewY: number, viewHeight: number, keyboardTop: number) =>
  Math.max(0, viewY + viewHeight - keyboardTop)

/** Where to scroll so a field sits in the uncovered part of the view; null when it already does. */
export function revealOffset({
  fieldY,
  fieldHeight,
  scrollY,
  viewportHeight,
  covered,
  margin = 24,
}: {
  fieldY: number
  fieldHeight: number
  scrollY: number
  viewportHeight: number
  covered: number
  margin?: number
}): number | null {
  const visible = viewportHeight - covered
  if (fieldY - margin < scrollY) return Math.max(0, fieldY - margin)
  if (fieldY + fieldHeight + margin > scrollY + visible)
    return fieldY + fieldHeight + margin - visible
  return null
}

interface Metrics {
  scrollY: number
  viewport: number
  covered: number
}

/** Everything here is a function or a value: the screen never touches a ref while rendering. */
export interface KeyboardFormController {
  container: (node: View | null) => void
  scroll: (node: ScrollView | null) => void
  content: (node: View | null) => void
  inset: number
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  onLayout: (event: LayoutChangeEvent) => void
  /** Pass as a field's `onFocus`: moving between fields keeps the new one in sight. */
  reveal: () => void
}

/**
 * Android draws edge to edge, so the window no longer shrinks for the keyboard
 * and a field low on a form stayed hidden under it. The screen owns this
 * controller: it listens to the keyboard, measures what it covers and scrolls
 * the focused field into the part still visible; `KeyboardForm` only draws.
 * No native module: the dev build and the published APK need nothing new.
 */
export function useKeyboardForm(): KeyboardFormController {
  const containerRef = useRef<View | null>(null)
  const scrollRef = useRef<ScrollView | null>(null)
  const contentRef = useRef<View | null>(null)
  const metrics = useRef<Metrics>({ scrollY: 0, viewport: 0, covered: 0 })
  const [inset, setInset] = useState(0)

  const reveal = useCallback(() => {
    requestAnimationFrame(() => {
      const field = TextInput.State.currentlyFocusedInput()
      const host = contentRef.current
      if (!field || !host || metrics.current.covered === 0) return
      field.measureLayout(
        host,
        (_x, y, _width, height) => {
          const target = revealOffset({
            fieldY: y,
            fieldHeight: height,
            scrollY: metrics.current.scrollY,
            viewportHeight: metrics.current.viewport,
            covered: metrics.current.covered,
          })
          if (target !== null) scrollRef.current?.scrollTo({ y: target, animated: true })
        },
        () => {}
      )
    })
  }, [])

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const show = Keyboard.addListener(showEvent, (event) => {
      containerRef.current?.measureInWindow((_x, y, _width, height) => {
        metrics.current.covered = keyboardOverlap(y, height, event.endCoordinates.screenY)
        setInset(metrics.current.covered)
        // The extra room lays out first; then the field scrolls into it.
        requestAnimationFrame(reveal)
      })
    })
    const hide = Keyboard.addListener(hideEvent, () => {
      metrics.current.covered = 0
      setInset(0)
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [reveal])

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    metrics.current.scrollY = event.nativeEvent.contentOffset.y
  }, [])
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    metrics.current.viewport = event.nativeEvent.layout.height
  }, [])

  const container = useCallback((node: View | null) => {
    containerRef.current = node
  }, [])
  const scroll = useCallback((node: ScrollView | null) => {
    scrollRef.current = node
  }, [])
  const content = useCallback((node: View | null) => {
    contentRef.current = node
  }, [])

  return { container, scroll, content, inset, onScroll, onLayout, reveal }
}

/** What the keyboard leaves between a field's lower edge and itself. */
const FIELD_MARGIN = 24

/** How far a field reaches under a keyboard whose top edge is at `keyboardTop`, margin included. */
export const hiddenUnderKeyboard = (fieldY: number, fieldHeight: number, keyboardTop: number) =>
  Math.max(0, fieldY + fieldHeight + FIELD_MARGIN - keyboardTop)

export interface KeyboardListController {
  container: (node: View | null) => void
  /** Extra room at the end of the list, so a field at its foot can rise above the keyboard. */
  inset: number
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  /** Brings the focused field above the keyboard; also a field's `onFocus`. */
  reveal: () => void
}

/**
 * `useKeyboardForm` for a list that holds a field among its rows, such as the
 * Concierge at the foot of Explorar's feed: a virtualized list has no content
 * view to measure a field against, so the field is measured in the window,
 * against the keyboard's own top edge, and the list scrolls by what is hidden.
 * `trailing` keeps what sits right under the field in sight too, such as its
 * send button.
 */
export function useKeyboardList(
  scrollToOffset: (offset: number) => void,
  trailing = 0
): KeyboardListController {
  const containerRef = useRef<View | null>(null)
  const offset = useRef(0)
  const keyboardTop = useRef<number | null>(null)
  const [inset, setInset] = useState(0)

  const reveal = useCallback(() => {
    requestAnimationFrame(() => {
      const field = TextInput.State.currentlyFocusedInput()
      const top = keyboardTop.current
      if (!field || top === null) return
      field.measureInWindow((_x, y, _width, height) => {
        const hidden = hiddenUnderKeyboard(y, height + trailing, top)
        if (hidden > 0) scrollToOffset(offset.current + hidden)
      })
    })
  }, [scrollToOffset, trailing])

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const show = Keyboard.addListener(showEvent, (event) => {
      keyboardTop.current = event.endCoordinates.screenY
      containerRef.current?.measureInWindow((_x, y, _width, height) => {
        setInset(keyboardOverlap(y, height, event.endCoordinates.screenY))
        // The extra room lays out first; then the field scrolls into it.
        requestAnimationFrame(reveal)
      })
    })
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardTop.current = null
      setInset(0)
    })
    return () => {
      show.remove()
      hide.remove()
    }
  }, [reveal])

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y
  }, [])
  const container = useCallback((node: View | null) => {
    containerRef.current = node
  }, [])

  return { container, inset, onScroll, reveal }
}

const RevealContext = createContext<() => void>(() => {})

/** A scrolling form whose focused field stays above the keyboard. */
export function KeyboardForm({
  children,
  style,
  contentContainerStyle,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  contentContainerStyle?: StyleProp<ViewStyle>
}) {
  const { container, scroll, content, inset, onScroll, onLayout, reveal } = useKeyboardForm()

  return (
    <RevealContext.Provider value={reveal}>
      <View ref={container} style={[styles.flex, style]} testID="keyboard-form">
        <ScrollView
          ref={scroll}
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={onScroll}
          onLayout={onLayout}
          contentContainerStyle={{ paddingBottom: inset }}
        >
          <View ref={content} collapsable={false} style={contentContainerStyle}>
            {children}
          </View>
        </ScrollView>
      </View>
    </RevealContext.Provider>
  )
}

/** A `TextInput` that, inside a `KeyboardForm`, scrolls itself into view when focused. */
export function FormTextInput({
  onFocus,
  ref,
  ...props
}: TextInputProps & { ref?: Ref<TextInput> }) {
  const reveal = useContext(RevealContext)
  return (
    <TextInput
      ref={ref}
      {...props}
      onFocus={(event) => {
        reveal()
        onFocus?.(event)
      }}
    />
  )
}

const styles = StyleSheet.create({ flex: { flex: 1 } })
