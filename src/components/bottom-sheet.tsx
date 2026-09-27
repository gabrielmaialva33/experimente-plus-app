import type { ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { MEASURE, useContentFrame } from '@/components/content-frame'
import { radius, spacing } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * A sheet's widest: the readable column plus its own gutters, so what it holds
 * lines up with the page under it. On a phone it spans the window as before.
 */
export const SHEET_MAX_WIDTH = MEASURE.readable + 2 * spacing.gutter

/**
 * A sheet that rises from the foot of the window, over a scrim that closes it.
 *
 * On a tablet or an unfolded phone it keeps a phone's measure, centred, rather
 * than a 1,280 dp slab with its few rows stretched across it; it also keeps
 * clear of a camera cutout at the side in landscape. The modal draws under the
 * system navigation bar, so the sheet reserves it: whatever the sheet holds
 * ends above the gesture bar or the buttons.
 */
export function BottomSheet({
  visible = true,
  onClose,
  closeLabel,
  animationType = 'fade',
  maxHeight,
  style,
  testID,
  children,
}: {
  visible?: boolean
  onClose: () => void
  /** What the scrim says to a screen reader, as the button that closes the sheet. */
  closeLabel: string
  animationType?: 'fade' | 'slide'
  /** A share of the window, such as '88%', for a sheet whose content scrolls. */
  maxHeight?: ViewStyle['maxHeight']
  style?: StyleProp<ViewStyle>
  testID?: string
  children: ReactNode
}) {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  const frame = useContentFrame(SHEET_MAX_WIDTH, 0)

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: colors.scrim }]}
        />
        <View
          accessibilityViewIsModal
          testID={testID}
          style={[
            styles.sheet,
            { marginLeft: frame.left, maxHeight, paddingBottom: insets.bottom, width: frame.width },
            style,
          ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { opacity: 0.45 },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    overflow: 'hidden',
  },
})
