import { useRouter } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { useAnnouncement } from '@/components/announce'
import { ContentSkeleton } from '@/components/content-skeleton'
import { EmptyState } from '@/components/empty-state'
import { useContentFrame } from '@/components/content-frame'
import { usePartnerAreas, useSession } from '@/session/context'
import { spacing } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

/**
 * Who may open a screen: anyone signed in (`account`), a partner who validates
 * (`validate`, `partner.redemptions.validate`) or one who reads the history of
 * uses (`history`, `partner.redemptions.read`).
 */
export type AccessArea = 'account' | 'validate' | 'history'

export type Access = 'loading' | 'unavailable' | 'anonymous' | 'denied' | 'allowed'

/**
 * Where the session stands for `area`. While the context is loading nothing is
 * decided (ADR-0022): a partner area is never mounted, and nothing private is
 * requested, before the server has said the actor has it.
 */
export function useAccess(area: AccessArea): Access {
  const { status } = useSession()
  const { canValidate, canReadHistory } = usePartnerAreas()
  if (status === 'loading') return 'loading'
  if (status === 'unavailable') return 'unavailable'
  if (status !== 'authenticated') return 'anonymous'
  if (area === 'validate' && !canValidate) return 'denied'
  if (area === 'history' && !canReadHistory) return 'denied'
  return 'allowed'
}

/**
 * Whether what `area` guards may be mounted now: it opens once the session
 * grants the area and closes only on a decision.
 *
 * Nothing opens while the session is undecided, but what is already open stays
 * open: a 403 revalidates the context in place, while an operation switch or a
 * sign-out passes through `loading`, and closing then would repeat a refused
 * request after every reload, in a loop. A reload that failed for want of a
 * connection (`unavailable`) is not a change of person either, as for the cache
 * guard. A decision (signed out, capability gone) closes it.
 *
 * The root navigator guards its private routes with it and `AccessGate` its
 * screens, so both layers open and close on the same rule.
 */
export function useAreaOpen(area: AccessArea): boolean {
  const access = useAccess(area)
  const undecided = access === 'loading' || access === 'unavailable'
  const [open, setOpen] = useState(false)
  if (access === 'allowed' && !open) setOpen(true)
  if (access !== 'allowed' && !undecided && open) setOpen(false)
  return access === 'allowed' || (undecided && open)
}

/**
 * Mounts `children` only once the session grants `area`.
 *
 * The root navigator already leaves out the private routes the session does
 * not grant, which also closes them to a link. This is the second layer, on the
 * screen itself: the server still refuses on every endpoint, and this keeps the
 * request from leaving and the screen from showing an area the actor does not
 * have, whatever route led there. It follows `useAreaOpen`: an open screen stays
 * mounted while the session is undecided, and what it holds privately is hidden
 * meanwhile by its own guards (`usePrivateOperation`).
 */
export function AccessGate({
  area,
  loadingLabel,
  children,
}: {
  area: AccessArea
  /** What the skeleton says while the session is read, the screen's own loading label. */
  loadingLabel: string
  children: ReactNode
}) {
  const access = useAccess(area)
  const open = useAreaOpen(area)

  if (access === 'allowed' || open) return children
  if (access === 'loading') return <ContentSkeleton label={loadingLabel} variant="detail" />
  return <AccessBlocked access={access} area={area} />
}

/** The one sentence and the one way forward for a screen the session does not open. */
export function AccessBlocked({
  access,
  area = 'account',
}: {
  access: Exclude<Access, 'allowed' | 'loading'>
  area?: AccessArea
}) {
  const colors = useColors()
  const frame = useContentFrame(undefined, spacing.xxl)
  const router = useRouter()
  const { refresh } = useSession()
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/'))

  const state =
    access === 'unavailable'
      ? {
          icon: 'cloud-offline-outline' as const,
          title: 'Não foi possível confirmar sua conta agora',
          action: { label: 'Tentar de novo', onPress: () => void refresh() },
        }
      : access === 'anonymous'
        ? {
            icon: 'log-in-outline' as const,
            title: 'Entre na sua conta para continuar',
            action: { label: 'Entrar', onPress: () => router.navigate('/(tabs)/sign-in') },
          }
        : {
            icon: 'lock-closed-outline' as const,
            title:
              area === 'history'
                ? 'Sua conta não tem permissão para consultar as utilizações.'
                : 'Sua conta não tem permissão para validar benefícios.',
            action: { label: 'Voltar', onPress: back },
          }
  // It replaces the screen the person was waiting for, so it is said.
  useAnnouncement(state.title)

  return (
    <View style={[styles.page, frame.padding, { backgroundColor: colors.background }]}>
      <EmptyState icon={state.icon} title={state.title} action={state.action} />
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'center', paddingVertical: spacing.xxl },
})
