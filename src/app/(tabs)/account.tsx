import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs, useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useCities } from '@/catalog/queries'
import { useSelectedCity } from '@/catalog/city-store'
import { announce } from '@/components/announce'
import { Avatar } from '@/components/avatar'
import { useContentFrame } from '@/components/content-frame'
import { ListGroup, ListRow } from '@/components/list-row'
import { ScreenHeader } from '@/components/screen-header'
import { openManual } from '@/help/manual'
import { useSession } from '@/session/context'
import { useLineCap, useStackedLayout } from '@/theme/font-scale'
import { useBandStatusBar } from '@/theme/system-bars'
import { minTouch, radius, spacing, textWeight, typography } from '@/theme/tokens'
import { useColors } from '@/theme/use-colors'

// The band below reserves the status bar, so the tab's native header steps aside.
const HEADER_OPTIONS = { headerShown: false }

/**
 * The account hub (audit A23): who is signed in, then the person's own things,
 * preferences, the manual and the account itself, each one row that opens its
 * screen. Editing the profile has a screen of its own, so a hub is not a form.
 */
export default function AccountScreen() {
  const colors = useColors()
  const router = useRouter()
  const { context, capabilities, signOut } = useSession()
  const user = context?.user
  const name = user?.full_name?.trim() || user?.username || 'Sua conta'
  const oneLine = useLineCap(1)
  const twoLines = useLineCap(2)
  // With large text the avatar goes above the name: beside it the e-mail broke every
  // few characters ("qa.appdevices / .179052317 / 2@example").
  const stacked = useStackedLayout()
  const frame = useContentFrame()
  useBandStatusBar()

  const citySlug = useSelectedCity()
  const cities = useCities()
  const city = cities.data?.find((candidate) => candidate.slug === citySlug)

  // The operation is a partner's working context; a consumer has nothing to do
  // with it and would only read an unexplained name (audit A54).
  const operation = capabilities?.partner?.enabled === true ? context?.active_operation : null

  // The tabs change under the person once the session ends; the change is said.
  const leave = async () => {
    await signOut()
    announce('Você saiu da conta.')
  }

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <Tabs.Screen options={HEADER_OPTIONS} />
      <ScrollView contentContainerStyle={styles.page}>
        <ScreenHeader>
          <View style={[styles.identity, stacked && styles.identityStacked]}>
            <Avatar name={user?.full_name || user?.username} tone="chrome" />
            <View style={[styles.who, stacked && styles.whoStacked]}>
              <Text
                accessibilityRole="header"
                numberOfLines={twoLines}
                style={[styles.name, { color: colors.chromeForeground }]}
              >
                {name}
              </Text>
              {user?.email ? (
                <Text numberOfLines={oneLine} style={[styles.email, { color: colors.chromeMuted }]}>
                  {user.email}
                </Text>
              ) : null}
              {operation ? (
                <Text numberOfLines={oneLine} style={[styles.email, { color: colors.chromeMuted }]}>
                  Operação ativa: {operation.name}
                </Text>
              ) : null}
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Editar perfil"
            onPress={() => router.push('/conta/perfil')}
            style={({ pressed }) => [
              styles.edit,
              { backgroundColor: colors.chromeRaised, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="create-outline" size={18} color={colors.chromeForeground} />
            <Text style={[styles.editLabel, { color: colors.chromeForeground }]}>
              Editar perfil
            </Text>
          </Pressable>
        </ScreenHeader>

        <View style={[styles.groups, frame.padding]}>
          {/* Anexo I item 10 — the person's own relationship with the catalogue. */}
          <ListGroup title="Minhas coisas">
            <ListRow
              icon="heart-outline"
              label="Favoritos"
              onPress={() => router.push('/conta/favoritos')}
            />
            <ListRow
              icon="notifications-outline"
              label="Seguindo"
              onPress={() => router.push('/conta/seguindo')}
            />
            <ListRow
              icon="trail-sign-outline"
              label="Roteiros"
              onPress={() => router.push('/roteiros')}
            />
            <ListRow
              icon="star-outline"
              label="Avaliações"
              onPress={() => router.push('/conta/avaliacoes')}
            />
          </ListGroup>

          <ListGroup title="Preferências">
            <ListRow
              icon="sparkles-outline"
              label="Interesses"
              onPress={() => router.push('/conta/interesses')}
            />
            <ListRow
              icon="location-outline"
              label="Cidade"
              value={citySlug ? city?.name : 'Nenhuma escolhida'}
              onPress={() => router.push('/conta/cidade')}
            />
          </ListGroup>

          {/* The whole manual, in the browser: the one help that is not about a single screen. */}
          <ListGroup>
            <ListRow
              icon="help-circle-outline"
              label="Ajuda e manual"
              external
              onPress={() => void openManual()}
              testID="account-manual"
            />
          </ListGroup>

          <ListGroup title="Conta">
            <ListRow
              icon="log-out-outline"
              label="Sair"
              chevron={false}
              onPress={() => void leave()}
            />
            <ListRow
              icon="trash-outline"
              label="Excluir conta"
              tone="destructive"
              onPress={() => router.push('/conta/excluir')}
            />
          </ListGroup>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { paddingBottom: spacing.xxl },
  identity: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  identityStacked: { alignItems: 'flex-start', flexDirection: 'column', gap: spacing.md },
  who: { flex: 1, gap: 2 },
  // In a column, `flex: 1` would mean a zero height.
  whoStacked: { alignSelf: 'stretch', flex: 0 },
  name: { ...typography.title, fontSize: 24, lineHeight: 28 },
  email: typography.body,
  edit: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: minTouch,
    paddingHorizontal: spacing.gutter,
  },
  editLabel: { ...typography.label, ...textWeight('700') },
  groups: { gap: spacing.section, paddingTop: spacing.xl },
})
