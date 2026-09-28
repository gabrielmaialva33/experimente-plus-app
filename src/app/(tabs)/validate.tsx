import Ionicons from '@expo/vector-icons/Ionicons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Linking, StyleSheet, Text, View } from 'react-native'

import { useAnnouncement } from '@/components/announce'
import { Button } from '@/components/button'
import { useContentFrame } from '@/components/content-frame'
import { decorative } from '@/components/decorative'
import { HelpLink } from '@/help/help-link'
import { usePartnerAreas } from '@/session/context'
import { radius, spacing, typography, textWeight } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'
import { extractPresentationToken } from '@/wallet/presentation-token'

const REJECTED = 'Este código não é uma apresentação válida. Peça um novo ao cliente.'
const CAMERA_FAILED =
  'Não foi possível abrir a câmera. Feche outros aplicativos que a estejam usando e tente de novo.'

const VALIDATE_HELP = { topic: 'validate', label: 'Como validar' } as const

/**
 * Partner scanner.
 *
 * Reading a code never confirms anything: it only resolves a token and moves to
 * an authenticated preview that a person has to confirm (ADR-0021). Scanning is
 * restricted to QR so each frame costs less work.
 */
export default function ValidateScreen() {
  const colors = useColors()
  const frame = useContentFrame()
  const router = useRouter()
  const { canValidate } = usePartnerAreas()
  const [permission, requestPermission, getPermission] = useCameraPermissions()
  const [rejected, setRejected] = useState(false)
  const [active, setActive] = useState(false)
  // A camera that could not start (in use elsewhere, a driver failure) says so
  // instead of leaving a black viewfinder; each new attempt mounts a new view.
  const [cameraFailed, setCameraFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const handled = useRef(false)
  const status = cameraFailed ? CAMERA_FAILED : rejected ? REJECTED : null
  // The status box below is a live region Android speaks as it changes; iOS is told here.
  useAnnouncement(status, { spokenByLiveRegion: true })

  // Coming back from the system settings: read the camera permission again.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void getPermission()
    })
    return () => subscription.remove()
  }, [getPermission])

  // Re-arming on focus, not on a timer: a partner still pointing at the same
  // code while reading the preview would otherwise push a duplicate screen and
  // fire a second preview request.
  useFocusEffect(
    useCallback(() => {
      handled.current = false
      setRejected(false)
      setCameraFailed(false)
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
    // Once refused for good the system no longer asks, so asking again would do
    // nothing: the way forward is the app's page in the system settings.
    const blocked = permission.canAskAgain === false
    return (
      <Centered icon="camera-outline">
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
          Leitor de códigos
        </Text>
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          {blocked
            ? 'A câmera está bloqueada para o Experimente+. Libere o acesso nas configurações do aparelho para ler o código do cliente.'
            : 'Para ler o código do cliente, o aplicativo precisa da câmera.'}
        </Text>
        {blocked ? (
          <Button
            label="Abrir configurações"
            icon="settings-outline"
            onPress={() => void Linking.openSettings()}
          />
        ) : (
          <Button label="Permitir câmera" icon="camera-outline" onPress={requestPermission} />
        )}
        <HistoryLink />
        {/* Blocked, the question is the phone's settings, which the troubleshooting section walks through. */}
        {blocked ? (
          <HelpLink topic="troubleshooting" label="Como liberar a câmera" />
        ) : (
          <HelpLink {...VALIDATE_HELP} />
        )}
      </Centered>
    )
  }

  return (
    // The camera runs under a side cutout; the sheet's text keeps the readable column.
    <View style={{ backgroundColor: colors.chrome, flex: 1 }}>
      <View style={styles.viewfinder}>
        {/* Unmounted when the screen loses focus: a camera running behind a
            pushed screen keeps scanning and keeps costing battery. */}
        {active && !cameraFailed ? (
          <CameraView
            key={attempt}
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScanned}
            onMountError={() => setCameraFailed(true)}
          />
        ) : (
          <View style={styles.camera} />
        )}
        {/* A frame to aim with; it draws over the camera and never takes a touch. */}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.aim}
        >
          <View
            style={[
              styles.frame,
              { borderColor: status ? colors.warning : colors.chromeForeground },
            ]}
          />
        </View>
      </View>
      <View style={[styles.sheet, frame.padding, { backgroundColor: colors.background }]}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>
          Leia o código do cliente
        </Text>
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.status,
            { backgroundColor: status ? colors.warningSoft : colors.primarySoft },
          ]}
        >
          <Ionicons
            name={status ? 'alert-circle-outline' : 'scan-outline'}
            size={20}
            color={status ? colors.warningAccent : colors.primaryAccent}
            {...decorative}
          />
          <Text
            style={[
              styles.statusText,
              { color: status ? colors.warningAccent : colors.primaryAccent },
            ]}
          >
            {status ?? 'Aponte para o código que o cliente está mostrando.'}
          </Text>
        </View>
        {cameraFailed ? (
          <Button
            label="Tentar de novo"
            variant="outline"
            size={44}
            icon="refresh"
            onPress={() => {
              setCameraFailed(false)
              setAttempt((value) => value + 1)
            }}
          />
        ) : null}
        {/* Secondary ways out share one line, so the viewfinder keeps its height. */}
        <View style={styles.links}>
          <HistoryLink />
          <HelpLink {...VALIDATE_HELP} />
        </View>
      </View>
    </View>
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

  return (
    <Button
      label="Ver utilizações"
      variant="ghost"
      size={44}
      icon="receipt-outline"
      onPress={() => router.push('/validar/historico')}
    />
  )
}

function Centered({
  icon,
  children,
}: {
  icon?: keyof typeof Ionicons.glyphMap
  children?: React.ReactNode
}) {
  const colors = useColors()
  const frame = useContentFrame(undefined, spacing.xxl)
  return (
    <View style={[styles.center, frame.padding, { backgroundColor: colors.background }]}>
      {icon ? (
        <View style={[styles.mark, { backgroundColor: colors.primarySoft }]} {...decorative}>
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
  aim: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  frame: { borderRadius: radius.sheet, borderWidth: 3, height: FRAME, width: FRAME },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    gap: spacing.md,
    marginTop: -radius.sheet,
    padding: spacing.gutter,
    paddingTop: spacing.xl,
  },
  status: {
    alignItems: 'flex-start',
    borderRadius: radius.surface,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  statusText: { ...typography.meta, ...textWeight('600'), flex: 1 },
  links: { columnGap: spacing.lg, flexDirection: 'row', flexWrap: 'wrap' },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  mark: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  title: { ...typography.heading, textAlign: 'center' },
  message: { ...typography.body, textAlign: 'center' },
})
