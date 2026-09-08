import { CameraView, useCameraPermissions } from 'expo-camera'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { usePartnerAreas } from '@/session/context'
import { radius, spacing, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { extractPresentationToken } from '@/wallet/presentation-token'

/**
 * Partner scanner.
 *
 * Reading a code never confirms anything: it only resolves a token and moves to
 * an authenticated preview that a person has to confirm (ADR-0021). Scanning is
 * restricted to QR so each frame costs less work.
 */
export default function ValidateScreen() {
  const colors = useColors()
  const router = useRouter()
  const { canValidate } = usePartnerAreas()
  const [permission, requestPermission] = useCameraPermissions()
  const [rejected, setRejected] = useState(false)
  const [active, setActive] = useState(false)
  const handled = useRef(false)

  // Re-arming on focus, not on a timer: a partner still pointing at the same
  // code while reading the preview would otherwise push a duplicate screen and
  // fire a second preview request.
  useFocusEffect(
    useCallback(() => {
      handled.current = false
      setRejected(false)
      setActive(true)
      return () => setActive(false)
    }, [])
  )

  const onScanned = useCallback(
    ({ data }: { data: string }) => {
      if (handled.current) return

      const token = extractPresentationToken(data)

      if (!token) {
        setRejected(true)
        return
      }

      handled.current = true
      router.push({ pathname: '/validar/confirmar', params: { token } })
    },
    [router]
  )

  // The area should not be reachable without the capability, but the screen
  // states it rather than rendering a camera the actor cannot use.
  if (!canValidate) {
    return (
      <Centered>
        <Text style={[styles.message, { color: colors.foreground }]}>
          Sua conta não tem permissão para validar benefícios.
        </Text>
        <HistoryLink />
      </Centered>
    )
  }

  if (!permission) {
    return <Centered />
  }

  if (!permission.granted) {
    return (
      <Centered>
        <Text style={[styles.message, { color: colors.foreground }]}>
          Para ler o código do cliente, o aplicativo precisa da câmera.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={requestPermission}
          style={[styles.action, { backgroundColor: colors.primary }]}>
          <Text style={[styles.actionLabel, { color: colors.primaryForeground }]}>Permitir câmera</Text>
        </Pressable>
        <HistoryLink />
      </Centered>
    )
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={{ backgroundColor: colors.background, flex: 1 }}>
      {/* Unmounted when the screen loses focus: a camera running behind a
          pushed screen keeps scanning and keeps costing battery. */}
      {active ? (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onScanned}
        />
      ) : (
        <View style={styles.camera} />
      )}
      <View style={styles.hint}>
        <HistoryLink />
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          {rejected
            ? 'Este código não é uma apresentação válida. Peça um novo ao cliente.'
            : 'Aponte para o código que o cliente está mostrando.'}
        </Text>
      </View>
    </SafeAreaView>
  )
}

/**
 * `partner.redemptions.read` governs the history, not `validate` — and neither
 * does the camera. An analyst who reads history and cannot validate would never
 * grant camera access, so gating the link on permission would hide an area they
 * are entitled to.
 */
function HistoryLink() {
  const colors = useColors()
  const router = useRouter()
  const { canReadHistory } = usePartnerAreas()

  if (!canReadHistory) {
    return null
  }

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/validar/historico')}>
      <Text style={[styles.actionLabel, { color: colors.primary }]}>Ver utilizações</Text>
    </Pressable>
  )
}

function Centered({ children }: { children?: React.ReactNode }) {
  const colors = useColors()
  return <View style={[styles.center, { backgroundColor: colors.background }]}>{children}</View>
}

const styles = StyleSheet.create({
  camera: { flex: 1 },
  hint: { gap: spacing.md, padding: spacing.xl },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  message: { ...typography.body, textAlign: 'center' },
  action: { borderRadius: radius.pill, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md },
  actionLabel: { ...typography.body, fontWeight: '700' },
})
