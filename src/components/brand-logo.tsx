import { Image, StyleSheet } from 'react-native'

/** The logo's own proportion (brand file, 2026-11): width over height. */
const ASPECT = 4.71

/**
 * The full "experimente+" logo, all white, for the deep-purple chrome band: the
 * brand asks for the white version on any dark background. It is a picture with
 * the product's name, so a screen reader still hears "Experimente+".
 */
export function BrandLogo({ height = 26 }: { height?: number }) {
  return (
    <Image
      source={require('../../assets/images/logo-branco.png')}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Experimente+"
      resizeMode="contain"
      style={[styles.logo, { height, width: Math.round(height * ASPECT) }]}
    />
  )
}

const styles = StyleSheet.create({
  logo: { flexShrink: 0 },
})
