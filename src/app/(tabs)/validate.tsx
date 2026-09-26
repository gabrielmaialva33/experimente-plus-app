import Ionicons from '@expo/vector-icons/Ionicons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/button'
import { usePartnerAreas } from '@/session/context'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
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
      <Centered icon="lock-closed-outline">
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
      <Centered icon="camera-outline">
        <Text style={[styles.title, { color: colors.foreground }]}>Leitor de códigos</Text>
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          Para ler o código do cliente, o aplicativo precisa da câmera.
        </Text>
        <Button label="Permitir câmera" icon="camera-outline" onPress={requestPermission} />
        <HistoryLink />
      </Centered>
    )
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={{ backgroundColor: colors.chrome, flex: 1 }}>
      <View style={styles.viewfinder}>
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
        {/* A frame to aim with; it draws over the camera and never takes a touch. */}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.aim}>
          <View style={[styles.frame, { borderColor: rejected ? colors.warning : colors.chromeForeground }]} />
        </View>
      </View>
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>Leia o código do cliente</Text>
        <View
          accessibilityLiveRegion="polite"
          style={[styles.status, { backgroundColor: rejected ? colors.warningSoft : colors.primarySoft }]}>
          <Ionicons
            name={rejected ? 'alert-circle-outline' : 'scan-outline'}
            size={20}
            color={rejected ? colors.warningAccent : colors.primaryAccent}
          />
          <Text style={[styles.statusText, { color: rejected ? colors.warningAccent : colors.primaryAccent }]}>
            {rejected
              ? 'Este código não é uma apresentação válida. Peça um novo ao cliente.'
              : 'Aponte para o código que o cliente está mostrando.'}
          </Text>
        </View>
        <HistoryLink />
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
  const router = useRouter()
  const { canReadHistory } = usePartnerAreas()

  if (!canReadHistory) {
    return null
  }

  return <Button label="Ver utilizações" variant="ghost" size={44} icon="receipt-outline" onPress={() => router.push('/validar/historico')} />
}

function Centered({ icon, children }: { icon?: keyof typeof Ionicons.glyphMap; children?: React.ReactNode }) {
  const colors = useColors()
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      {icon ? (
        <View style={[styles.mark, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={icon} size={28} color={colors.primaryAccent} />
        </View>
      ) : null}
      {children}
    </View>
  )
}

const FRAME = 232

const styles = StyleSheet.create({
  viewfinder: { flex: 1 },
  camera: { flex: 1 },
  aim: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  frame: { borderRadius: radius.sheet, borderWidth: 3, height: FRAME, width: FRAME },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    gap: spacing.md,
    marginTop: -radius.sheet,
    padding: spacing.gutter,
    paddingTop: spacing.xl,
  },
  status: { alignItems: 'flex-start', borderRadius: radius.surface, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  statusText: { ...typography.meta, ...textWeight('600'), flex: 1 },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  mark: { alignItems: 'center', borderRadius: radius.pill, height: 64, justifyContent: 'center', width: 64 },
  title: { ...typography.heading, textAlign: 'center' },
  message: { ...typography.body, textAlign: 'center' },
})
